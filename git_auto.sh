#!/bin/bash


if [ -z "$1" ]; then
    echo "Usage: $0 \"message du commit\""
    exit 1
fi


git add .
git commit -m "$1"
git pull --rebase
git push

echo "Commit et push effectués avec succès !"
