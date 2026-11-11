"""Alembic env.py — async-aware migration environment for passport-platform app-service."""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# ---------------------------------------------------------------------------
# Make sure "app" package is importable when alembic runs from project root.
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Import all models so that Base.metadata is fully populated before we
# reference target_metadata below.
from app.database import Base  # noqa: E402
import app.models  # noqa: E402  (re-exports all model modules)

config = context.config

# Interpret the config file for Python logging if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata — Alembic uses this to generate diff migrations.
target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Read the sync connection URL from the environment.
# We use psycopg2 (sync) for Alembic; asyncpg is only for the async runtime.
# ---------------------------------------------------------------------------
DATABASE_URL_SYNC: str = os.environ["DATABASE_URL_SYNC"]


def include_schemas(name: str, type_: str, parent_names: list[str]) -> bool:
    """Only include objects that belong to the 'app' schema."""
    if type_ == "schema":
        return name in (None, "app")
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection required)."""
    context.configure(
        url=DATABASE_URL_SYNC,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema="app",
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with a live connection."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = DATABASE_URL_SYNC

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema="app",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
