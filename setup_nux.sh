#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update package list
sudo apt-get update

# Install Node.js if it's not already installed
if ! command_exists node; then
    echo "Node.js not found. Installing Node.js..."
    sudo apt-get install -y nodejs npm
else
    echo "Node.js is already installed."
fi

# Install 7-Zip if it's not already installed
if ! command_exists 7z; then
    echo "7-Zip not found. Installing 7-Zip..."
    sudo apt-get install -y p7zip-full
else
    echo "7-Zip is already installed."
fi

# Install MAME if it's not already installed
if ! command_exists mame; then
    echo "MAME not found. Installing MAME..."
    sudo apt-get install -y mame
else
    echo "MAME is already installed."
fi