FROM rust:1.80-slim-bullseye as builder

WORKDIR /usr/src/app

# Install dependencies needed for build (e.g. pkg-config, openssl, sqlite3)
RUN apt-get update && apt-get install -y pkg-config libssl-dev libsqlite3-dev

# Create dummy project to cache dependencies
RUN cargo new skelenote-core
WORKDIR /usr/src/app/skelenote-core
COPY Cargo.toml Cargo.lock ./
# We need to copy other referenced files if workspace?
# Assuming standalone for now or copying only this crate.
# But build might fail if referenced crate
# Wait, skelenote-core is the project. 

# Build deps
RUN cargo build --release --bin skelenote
RUN rm src/*.rs

# Copy real source
COPY . .

# Build app
RUN cargo build --release --bin skelenote

# Runtime image
FROM debian:bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libssl1.1 libsqlite3-0 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/skelenote-core/target/release/skelenote /app/skelenote

EXPOSE 8080

CMD ["/app/skelenote", "relay", "--port", "8080"]
