#!/bin/bash

echo "Starting and connecting to existing TruBudget Node"

COMPOSE="docker-compose -f docker-compose/master/slave-node.yml -p trubudget"

$COMPOSE down
docker rm $(docker ps -q --filter status=exited --filter label=com.docker.compose.project=trubudget)

$COMPOSE build --pull
$COMPOSE up