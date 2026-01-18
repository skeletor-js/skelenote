# The Origin

I've spent 15 years in startups and over two decades obsessing over productivity systems. I've paid for every note-taking app you can name—often two or three simultaneously because none of them were ever quite right. Every tool had something I liked, but none were perfect. They update constantly, change direction, and the subscriptions add up.

So I built my own. with Claude Code, co-collaborating.

## The Problem I'm Solving

Most note-taking apps make a promise they eventually break: your data is private, local, secure. Then the VC money comes in, the enterprise roadmap takes over, collaboration features get prioritized, and suddenly your "local-first" app is just another cloud service with extra steps.

I wanted something different:

* **Actually local.** Not "local with cloud backup"—local.
* **Actually encrypted.** Zero-knowledge, not "we promise we won't look."
* **Actually simple.** Works on all my devices without needing to trust a third party.

## Why P2P Sync Matters

Here's the thing: I don't need my data to exist anywhere but my devices. If my phone and MacBook are in the same room, they can sync directly. There's almost never a scenario where I'm editing on one device and won't eventually be near my other device. P2P solves my problem without requiring the cloud.

For those who want always-on sync, I built self-hosted relay support. Run your own relay, keep your data yours. That's the whole point. Or pay for our optional cloud sync service, but we keep that fully encrypted E2E too.

## The Technical Philosophy

I hate Electron. I've been wanting to learn Rust. So Tauri 2.0 was a natural fit. Loro CRDTs give me conflict-free sync that actually works. XChaCha20-Poly1305 encryption because security shouldn't be an afterthought.

Every technical decision flows from one principle: local-first, zero-knowledge, no compromises.

## The Contrarian Position

Here's something I've never been able to understand: How are companies building multi-million dollar businesses on notetaking apps? On task management apps? On productivity systems? It's text. It's files. Why does this cost us so much each month? What are we really paying for?

I'm not building this to make money. I'm building this because I think the whole model is broken. If this ends up disrupting an industry by proving "hey, this shouldn't cost what it costs"—good. The power of AI should democratize access, not entrench existing inequalities.

## Unapologetically Single-Player

I'm not chasing enterprise. I don't care about collaboration features. The vast majority of people don't need real-time co-editing—they need their data secure and accessible. That's it.

If you want to share? Export your library. Simple.

This isn't a limitation; it's a feature. It's focus.

This app is for those that need a secure, personal place to think, work, write, and store their digital world.

## Where We Are

Desktop and mobile are here. In benchmark tests, all app features hold up with libraries as small as 5 notes and as large as 100,000. We're pushing biweekly releases with new features, and we're fully transparent about what's coming down the pipeline next. Even better? Our discord is open and we love discussion and suggestions on what we should add.

I'm not building this to make money. I'm building something I actually want to use every day. If skelenote works for you too, join the community and let's chat.
