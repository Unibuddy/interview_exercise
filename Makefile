
export UB_SERVICE=chat-service
BRANCH :=$(shell git branch --show-current | tr '[:upper:]' '[:lower:]')

.PHONY: sonar, outside_in


build: 
	docker build -f Dockerfile.outside-in -t chat-service-outside-in:latest .

down:
	docker-compose --file docker-compose.yaml --file docker-compose.coverage.yaml down


# Run the outside in tests locally, and store the coverage in ./outside_
outside_in: down build
	docker compose --file docker-compose.yaml --file docker-compose.coverage.yaml up  --detach --force-recreate --build chat-service
	docker compose --file docker-compose.yaml --file docker-compose.coverage.yaml up  --build outside-in
	docker compose --file docker-compose.yaml --file docker-compose.coverage.yaml exec chat-service /bin/sh -c "pidof node | xargs kill"
	sleep 2
	docker compose --file docker-compose.yaml --file docker-compose.coverage.yaml exec chat-service /bin/sh -c "/service/node_modules/.bin/nyc report --reporter lcov --report-dir coverage --include 'src/**/*.controller.*' --include 'src/**/*.resolver.*'"
	sleep 3
	docker compose --file docker-compose.yaml --file docker-compose.coverage.yaml cp chat-service:/service/.nyc_output outside_in/nyc_output
	docker compose --file docker-compose.yaml --file docker-compose.coverage.yaml cp chat-service:/service/coverage outside_in/coverage


# Run sonar scanner locally, and push a report to sonarcloud
# Needs sonar-scanner installed, and SONAR_TOKEN env var set
sonar:
	sonar-scanner -Dsonar.branch.name=${BRANCH}
