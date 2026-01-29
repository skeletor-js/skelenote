use ratatui::style::{Color, Modifier, Style};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThemeVariant {
    Claude,
    OneDarkPro,
    Dracula,
    TokyoNight,
    Catppuccin,
    NightOwl,
    SynthWave84,
}

impl ThemeVariant {
    pub fn next(&self) -> Self {
        match self {
            Self::Claude => Self::OneDarkPro,
            Self::OneDarkPro => Self::Dracula,
            Self::Dracula => Self::TokyoNight,
            Self::TokyoNight => Self::Catppuccin,
            Self::Catppuccin => Self::NightOwl,
            Self::NightOwl => Self::SynthWave84,
            Self::SynthWave84 => Self::Claude,
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Claude => "Claude Inspired",
            Self::OneDarkPro => "One Dark Pro",
            Self::Dracula => "Dracula",
            Self::TokyoNight => "Tokyo Night",
            Self::Catppuccin => "Catppuccin",
            Self::NightOwl => "Night Owl",
            Self::SynthWave84 => "SynthWave '84",
        }
    }
}

pub struct Theme {
    pub variant: ThemeVariant,
    pub root: Style,
    pub border_default: Style,
    pub border_focus: Style,
    pub tab_active: Style,
    pub tab_inactive: Style,
    pub tab_divider: Style,
    pub list_default: Style,
    pub list_selected: Style,
    pub list_selected_focus: Style,
    pub list_prefix_viewing: String,
    pub list_prefix_selected: String,
    pub content_default: Style,
    pub content_cursor: Style,
    pub status_bar: Style,
    pub status_bar_input: Style,
    pub status_bar_mode_note: Style,
    pub status_bar_mode_meta: Style,
    pub syntax_header: Style,
    pub syntax_link: Style,
    pub syntax_list: Style,
    pub syntax_todo: Style,
}

impl Theme {
    pub fn from_variant(variant: ThemeVariant) -> Self {
        match variant {
            ThemeVariant::Claude => Self::claude(),
            ThemeVariant::OneDarkPro => Self::one_dark_pro(),
            ThemeVariant::Dracula => Self::dracula(),
            ThemeVariant::TokyoNight => Self::tokyo_night(),
            ThemeVariant::Catppuccin => Self::catppuccin(),
            ThemeVariant::NightOwl => Self::night_owl(),
            ThemeVariant::SynthWave84 => Self::synthwave_84(),
        }
    }

    fn claude() -> Self {
        // Claude-inspired: Warm, clean, light-ish text on dark background or neutral
        // Going for the dark mode Claude look
        let bg = Color::Rgb(40, 40, 35); // Warm dark
        let fg = Color::Rgb(220, 215, 200); // Warm white
        let accent = Color::Rgb(217, 119, 87); // Claude orange-ish
        let secondary = Color::Rgb(140, 135, 120);

        Self {
            variant: ThemeVariant::Claude,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(secondary),
            border_focus: Style::default().fg(accent),
            tab_active: Style::default().fg(accent).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(secondary),
            tab_divider: Style::default().fg(secondary),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(accent),
            list_selected_focus: Style::default().fg(accent).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(fg).fg(bg),
            status_bar: Style::default().fg(secondary),
            status_bar_input: Style::default().fg(accent),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(Color::Magenta),
            syntax_header: Style::default().fg(accent).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(Color::Blue),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }

    fn one_dark_pro() -> Self {
        let bg = Color::Rgb(40, 44, 52);
        let fg = Color::Rgb(171, 178, 191);
        let blue = Color::Rgb(97, 175, 239);
        let purple = Color::Rgb(198, 120, 221);
        let grey = Color::Rgb(92, 99, 112);

        Self {
            variant: ThemeVariant::OneDarkPro,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(grey),
            border_focus: Style::default().fg(blue),
            tab_active: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(grey),
            tab_divider: Style::default().fg(grey),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(blue),
            list_selected_focus: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(blue).fg(bg),
            status_bar: Style::default().fg(grey),
            status_bar_input: Style::default().fg(blue),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(purple),
            syntax_header: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(purple),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }

    fn dracula() -> Self {
        let bg = Color::Rgb(40, 42, 54);
        let fg = Color::Rgb(248, 248, 242);
        let purple = Color::Rgb(189, 147, 249);
        let pink = Color::Rgb(255, 121, 198);
        let comment = Color::Rgb(98, 114, 164);
        let cyan = Color::Rgb(139, 233, 253);

        Self {
            variant: ThemeVariant::Dracula,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(comment),
            border_focus: Style::default().fg(purple),
            tab_active: Style::default().fg(purple).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(comment),
            tab_divider: Style::default().fg(comment),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(pink),
            list_selected_focus: Style::default().fg(pink).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(purple).fg(bg),
            status_bar: Style::default().fg(comment),
            status_bar_input: Style::default().fg(cyan),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(pink),
            syntax_header: Style::default().fg(purple).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(cyan),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }

    fn tokyo_night() -> Self {
        let bg = Color::Rgb(26, 27, 38);
        let fg = Color::Rgb(192, 202, 245);
        let blue = Color::Rgb(122, 162, 247);
        let purple = Color::Rgb(157, 124, 216);
        let comment = Color::Rgb(86, 95, 137);
        let cyan = Color::Rgb(125, 207, 255);

        Self {
            variant: ThemeVariant::TokyoNight,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(comment),
            border_focus: Style::default().fg(blue),
            tab_active: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(comment),
            tab_divider: Style::default().fg(comment),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(blue),
            list_selected_focus: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(blue).fg(bg),
            status_bar: Style::default().fg(comment),
            status_bar_input: Style::default().fg(cyan),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(purple),
            syntax_header: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(cyan),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }

    fn catppuccin() -> Self {
        // Mocha flavor
        let bg = Color::Rgb(30, 30, 46);
        let fg = Color::Rgb(205, 214, 244);
        let mauve = Color::Rgb(203, 166, 247);
        let surface1 = Color::Rgb(69, 71, 90);
        let peach = Color::Rgb(250, 179, 135);
        let blue = Color::Rgb(137, 180, 250);

        Self {
            variant: ThemeVariant::Catppuccin,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(surface1),
            border_focus: Style::default().fg(mauve),
            tab_active: Style::default().fg(mauve).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(surface1),
            tab_divider: Style::default().fg(surface1),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(peach),
            list_selected_focus: Style::default().fg(peach).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(mauve).fg(bg),
            status_bar: Style::default().fg(surface1),
            status_bar_input: Style::default().fg(blue),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(peach),
            syntax_header: Style::default().fg(mauve).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(blue),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }

    fn night_owl() -> Self {
        let bg = Color::Rgb(1, 22, 39);
        let fg = Color::Rgb(214, 222, 235);
        let blue = Color::Rgb(130, 170, 255);
        let magenta = Color::Rgb(199, 146, 234);
        let grey = Color::Rgb(99, 119, 119);
        let cyan = Color::Rgb(127, 219, 202);

        Self {
            variant: ThemeVariant::NightOwl,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(grey),
            border_focus: Style::default().fg(magenta),
            tab_active: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(grey),
            tab_divider: Style::default().fg(grey),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(blue),
            list_selected_focus: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(cyan).fg(bg),
            status_bar: Style::default().fg(grey),
            status_bar_input: Style::default().fg(cyan),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(magenta),
            syntax_header: Style::default().fg(blue).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(magenta),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }

    fn synthwave_84() -> Self {
        let bg = Color::Rgb(43, 33, 58); // Deep purple
        let fg = Color::Rgb(255, 255, 255); // White-ish with glow effect simulated by brightness
        let neon_pink = Color::Rgb(255, 113, 206);
        let neon_blue = Color::Rgb(1, 205, 254);
        let yellow = Color::Rgb(255, 251, 150);
        let grey = Color::Rgb(132, 126, 149);

        // Synthwave 84 is defined by its glow.
        // We can't really do glow in TUI, but we can use high contrast neon.

        Self {
            variant: ThemeVariant::SynthWave84,
            root: Style::default().bg(bg).fg(fg),
            border_default: Style::default().fg(grey),
            border_focus: Style::default().fg(neon_pink),
            tab_active: Style::default().fg(neon_pink).add_modifier(Modifier::BOLD),
            tab_inactive: Style::default().fg(grey),
            tab_divider: Style::default().fg(grey),
            list_default: Style::default().fg(fg),
            list_selected: Style::default().fg(yellow),
            list_selected_focus: Style::default().fg(yellow).add_modifier(Modifier::BOLD),
            list_prefix_viewing: "▶ ".to_string(),
            list_prefix_selected: "› ".to_string(),
            content_default: Style::default().fg(fg),
            content_cursor: Style::default().bg(neon_pink).fg(bg),
            status_bar: Style::default().fg(grey),
            status_bar_input: Style::default().fg(neon_blue),
            status_bar_mode_note: Style::default().fg(Color::Green),
            status_bar_mode_meta: Style::default().fg(neon_pink),
            syntax_header: Style::default().fg(neon_pink).add_modifier(Modifier::BOLD),
            syntax_link: Style::default().fg(neon_blue),
            syntax_list: Style::default().fg(fg),
            syntax_todo: Style::default().fg(Color::Green),
        }
    }
}
