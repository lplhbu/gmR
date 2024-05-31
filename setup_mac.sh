#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Homebrew if it's not already installed
if ! command_exists brew; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "Homebrew is already installed."
fi

# Install Node.js using Homebrew
if ! command_exists node; then
    echo "Node.js not found. Installing Node.js..."
    brew install node
else
    echo "Node.js is already installed."
fi

# Install 7-Zip using Homebrew if it's not already installed
if ! command_exists 7z; then
    echo "7-Zip not found. Installing 7-Zip..."
    brew install p7zip
else
    echo "7-Zip is already installed."
fi

# Install MAME using Homebrew if it's not already installed
if ! command_exists mame; then
    echo "MAME not found. Installing MAME..."
    brew install mame
else
    echo "MAME is already installed."
fi