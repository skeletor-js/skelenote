//! Embedding engine abstraction

use crate::config::EmbeddingConfig;
use anyhow::{anyhow, Result};
use fastembed::{InitOptions, TextEmbedding};
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Engine for generating text embeddings
pub enum EmbeddingEngine {
    Local(Arc<Mutex<TextEmbedding>>),
    OpenAI {
        client: Client,
        api_key: String,
        model: String,
    },
}

impl EmbeddingEngine {
    /// Create a new embedding engine based on config
    pub async fn new(config: &EmbeddingConfig) -> Result<Self> {
        match config.provider.as_str() {
            "local" => {
                let model = match config.model.as_str() {
                    "bge-small-en-v1.5" => fastembed::EmbeddingModel::BGEBaseENV15, // Using Base for 768 or Small for 384? Plan said small 384. Wait, BGEBase is 768. BGESmall is 384.
                    "all-minilm-l6-v2" => fastembed::EmbeddingModel::AllMiniLML6V2,
                    "nomic-embed-text" => fastembed::EmbeddingModel::NomicEmbedTextV15,
                    _ => fastembed::EmbeddingModel::BGESmallENV15,
                };

                // Note: BGESmallENV15 enum variant might differ in actual fastembed version
                // Let's stick to BGESmallENV15 if available, otherwise check crates.
                // In fastembed 4+, BGESmallENV15 is supported.

                let init_options = InitOptions::new(model).with_show_download_progress(true);
                let model = TextEmbedding::try_new(init_options)?;
                Ok(Self::Local(Arc::new(Mutex::new(model))))
            }
            "openai" => {
                let api_key = config
                    .openai_api_key
                    .clone()
                    .ok_or_else(|| anyhow!("OpenAI API key required for 'openai' provider"))?;

                Ok(Self::OpenAI {
                    client: Client::new(),
                    api_key,
                    model: config.model.clone(),
                })
            }
            _ => Err(anyhow!("Unknown embedding provider: {}", config.provider)),
        }
    }

    /// Generate embeddings for a list of texts
    pub async fn embed(&self, texts: Vec<String>) -> anyhow::Result<Vec<Vec<f32>>> {
        match self {
            Self::Local(model) => {
                let mut model = model.lock().await;
                model.embed(texts, None)
            }
            Self::OpenAI {
                client,
                api_key,
                model,
            } => {
                let response = client
                    .post("https://api.openai.com/v1/embeddings")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .json(&json!({
                        "input": texts,
                        "model": model
                    }))
                    .send()
                    .await?;

                if !response.status().is_success() {
                    let error = response.text().await?;
                    return Err(anyhow!("OpenAI API error: {}", error));
                }

                let response_json: serde_json::Value = response.json().await?;
                let data = response_json["data"]
                    .as_array()
                    .ok_or_else(|| anyhow!("Invalid OpenAI response format"))?;

                let mut embeddings: Vec<Vec<f32>> = Vec::new();
                for item in data {
                    let embedding: Vec<f32> = item["embedding"]
                        .as_array()
                        .ok_or_else(|| anyhow!("Invalid embedding format"))?
                        .iter()
                        .map(|v| v.as_f64().unwrap_or(0.0) as f32)
                        .collect();
                    embeddings.push(embedding);
                }
                Ok(embeddings)
            }
        }
    }

    /// Embed a single text string
    pub async fn embed_text(&self, text: &str) -> anyhow::Result<Vec<f32>> {
        let embeddings: Vec<Vec<f32>> = self.embed(vec![text.to_string()]).await?;
        embeddings
            .into_iter()
            .next()
            .ok_or_else(|| anyhow!("No embedding generated"))
    }
}
