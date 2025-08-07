# Raycast × GitHub Models

This Raycast extension lets you chat with models from the [GitHub Models API](https://models.github.ai).

## Setup

1. Create a [GitHub personal access token](https://docs.github.com/en/authentication) with access to the Models API.
2. Install the extension and open Raycast preferences.
3. Set your **GitHub Token** and choose a **Default Model**. Optionally set an **Organization** if you use org-scoped models.
4. Adjust **Streaming**, **Temperature**, and **Max Tokens** preferences as needed.

## Usage

Run the command **Chat with GitHub Models** and start typing. Responses stream as they are generated.

## Known Limitations

- Latency depends on the selected model/provider.
- The extension does not store your token or prompts.

## Development

This project replaces the previous Ollama integration with the GitHub Models API.
