#!/bin/bash
echo "Starting TruBudget"

COMPOSE="docker-compose -f docker-compose/master/master-node.yml -p trubudget"

$COMPOSE down
docker rm $(docker ps -q --filter status=exited --filter label=com.docker.compose.project=trubudget)

$COMPOSE build --pull
$COMPOSE up