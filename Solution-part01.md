# Solution - Part 01

[ Before starting the challenge, I reviewed Docker documentation and tutorials to understand the key concepts of containerization. This study helped me in understanding the project and work out how containers connect to each other. ]

## 01. Initial Setup
I began with an existing `docker-compose.yaml` file that defined services for MongoDB, Redis and a mock server.

## 02. Adding NestJS application
### Observation:
 After scanning through the root directory, I noticed there was no Dockerfile for the NestJS application. The Dockerfile is essential for building and running the application within a Docker container.

### Action: 
I created a dockerfile. This file included instructions for the container specifying dependencies, scripts, ports and the working directory required for the application to run.

## 03. Updating with Docker Compose file
I updated the `docker-compose.yaml` file to include the NestJS application as a new service. This allowed the application to be built and run using Docker Compose.

## 04. Starting the Environment
With all containers (NestJS, MongoDB, Redis & Mock server) up and running, I initiated the server using `npm run start:dev`.

## Errors
The first error I encountered was `Error: getaddrinfo ENOTFOUND redis`. While checking the logs for MongoDB database, I noticed that the NestJS application failed to connect to MongoDB. 

## Understanding the cause
I examined the `configuration-manager.utils.ts` file to locate MongoDB configurations. It showed that the Mongodb connection string was set to `127.0.0.1`, meaning the NestJS application was trying to connect to MongoDB within its own container. 

## 05. Solution
To resolve the issue, I updated MongoDB connection string to `interview_exercise-mongo-1` (MongoDB's container). This adjustment directed NestJS application to connect to MongoDB's container specifically, enabling data storage and retrieval as intended.

