//! Skelenote CLI & TUI entry point

use clap::{Parser, Subcommand};
use skelenote_core::{Config, Vault};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "skelenote")]
#[command(about = "Headless productivity backend with MCP interface")]
#[command(version)]
struct Cli {
    /// Path to notes vault (default: ~/notes)
    #[arg(short, long)]
    vault: Option<PathBuf>,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the MCP server
    Serve {
        /// Port for HTTP server
        #[arg(short, long, default_value = "3000")]
        port: u16,
    },
    /// Start the TUI
    Tui {
        /// Enable file watcher
        #[arg(short, long)]
        watch: bool,
    },
    /// Initialize a new vault
    Init {
        /// Path for new vault
        path: Option<PathBuf>,
    },
    /// Search notes
    Search {
        /// Search query
        query: String,
        /// Use semantic search
        #[arg(short, long)]
        semantic: bool,
    },
    /// List tasks
    Tasks {
        /// Filter: today, week, overdue, all
        #[arg(short, long, default_value = "today")]
        filter: String,
    },
    /// Open daily note
    Daily {
        /// Date (YYYY-MM-DD), default today
        date: Option<String>,
    },
    /// Quick capture to inbox
    Capture {
        /// Content to capture
        content: String,
    },
    /// Start relay server
    Relay {
        /// Port
        #[arg(short, long, default_value = "8080")]
        port: u16,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    let cli = Cli::parse();

    // Determine vault path
    let vault_path = cli.vault.unwrap_or_else(|| {
        directories::UserDirs::new()
            .map(|dirs| dirs.home_dir().join("notes"))
            .unwrap_or_else(|| PathBuf::from("./notes"))
    });

    // Load or create config
    let config = Config::load_or_create(&vault_path)?;
    
    // Open vault
    let vault = Vault::open(&vault_path, config).await?;

    match cli.command {
        Some(Commands::Serve { port }) => {
            tracing::info!("Starting MCP server on port {}", port);
            vault.start_watcher().await?;
            skelenote_core::mcp::serve(vault, port).await?;
        }
        Some(Commands::Tui { watch }) => {
            if watch {
                vault.start_watcher().await?;
            }
            run_tui(vault).await?;
        }
        None => {
            // Default to TUI without watch (or with? Default false)
            run_tui(vault).await?;
        }
        Some(Commands::Init { path }) => {
            let init_path = path.unwrap_or(vault_path);
            Vault::init(&init_path).await?;
            println!("Initialized vault at: {}", init_path.display());
        }
        Some(Commands::Search { query, semantic }) => {
            let results = if semantic {
                vault.semantic_search(&query, 10).await?
            } else {
                vault.search(&query, 10).await?
            };
            for result in results {
                println!("{}: {}", result.path.display(), result.title);
            }
        }
        Some(Commands::Tasks { filter }) => {
            let tasks = vault.list_tasks(&filter).await?;
            for task in tasks {
                let status = if task.done { "x" } else { " " };
                println!("[{}] {} ({})", status, task.text, task.source.display());
            }
        }
        Some(Commands::Daily { date }) => {
            let note = vault.get_or_create_daily(date.as_deref()).await?;
            // Open in $EDITOR
            let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
            std::process::Command::new(editor)
                .arg(&note.path)
                .status()?;
        }
        Some(Commands::Capture { content }) => {
            vault.quick_capture(&content).await?;
            println!("Captured to inbox");
        }
        Some(Commands::Relay { port }) => {
            skelenote_core::relay::server::serve(port).await?;
        }
    }

    Ok(())
}

async fn run_tui(vault: Vault) -> anyhow::Result<()> {
    skelenote_core::tui::run(vault).await
}
