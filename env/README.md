# How to Create a Local .env File

This directory is used for managing environment variables for local development. The main `.gitignore` file is configured to ignore the actual `.env` file, so you will not commit secrets to the repository.

## Setup Steps

1.  **Copy the sample file**: From the root of the project, run the following command to create your local environment file:

    ```sh
    cp env/.env.sample env/.env
    ```

2.  **Edit the `.env` file**: Open `env/.env` in your editor. Fill in the required values for each variable.

    ```ini
    # Example:
    SECRET_KEY=your_super_secret_key_here
    DB_URL=postgresql://user:pass@localhost:5432/smbsec
    OSINT_SHODAN_API_KEY=your_shodan_key_here
    ```

3.  **Source the variables (optional)**: Some tools and scripts might require these variables to be present in your shell's environment. While many frameworks (like FastAPI with `pydantic-settings` or Node with `dotenv`) can load them from the file directly, you can also source them manually if needed:
    ```sh
    set -a # automatically export all variables
    source env/.env
    set +a
    ```

## Security Reminder

**NEVER** commit the `env/.env` file or any other file containing secrets to version control. The `.gitignore` at the repository root is already configured to prevent this, but always be vigilant.
