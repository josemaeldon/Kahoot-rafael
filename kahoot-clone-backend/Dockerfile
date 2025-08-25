# Use the official Rust image as base
FROM rust:1.75-alpine AS builder

# Set working directory
WORKDIR /app

# Copy Cargo files
COPY Cargo.toml ./

# Copy source code
COPY src ./src

# Build the application in release mode
RUN cargo build --release

# Use a minimal alpine image for the runtime
FROM alpine:3.18

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001 -G appuser

# Set working directory
WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/target/release/kahoot-server .

# Change ownership
RUN chown appuser:appuser /app/kahoot-server && chmod +x /app/kahoot-server

# Switch to non-root user
USER appuser

# Expose port 8000
EXPOSE 8000

# Set environment variables
ENV RUST_LOG=info

# Start the application
CMD ["./kahoot-server"]