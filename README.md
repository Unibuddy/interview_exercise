# Unibuddy Engineering Exercise

This exercise is based on the deployed Unibuddy Chat service. The chat service is a core component in our product suite. 
We've based our interview exercise on this code so you can get a feel of the code and products you'd been working on, and we can understand how you would adapt to working with our code base! 


## Chat Service

Chat service provides GraphQL and Rest interfaces to our chat API. We mostly use GraphQL for interacting with it. 

The service is built on [Nest](https://github.com/nestjs/nest), using TypeScript.
We use [Jest](https://jestjs.io/docs/getting-started) for testing and encourage Test Driven Development. 


## Prep
You'll want the following tools installed to help in the exercise:

| Dependency  | Install link |
|------|-----|
|Docker | https://docs.docker.com/get-docker/ |
|Nodejs | https://nodejs.org/en/download/package-manager|
|Nvm | https://github.com/nvm-sh/nvm/blob/master/README.md |

### Usage

cd to the repo (you'll fork and clone this in the exercise itself.)

First, get the supporting services running:

```bash
$ docker compose up -d
```

next, switch to the right versions of node, etc

```bash
$ nvm use
```

Finally, install the require dependencies

```bash
$ npm install
```

Once this is complete, you should be good the run the code - check package.json for examples of what functions are alreasy defined. 

e.g.

```bash
$ npm run test
```

# Interview Exercise

The exercise is broken into 3 parts. To attempt the exercise, we'd like you to fork this repo, making the changes to your own version of the code. 
We encourage you to submit solutions to each part of the exercise as seperate commits, back to your fork, so that it's easier to follow and discuss. 

When you've completed the exercise, please add the following github handles to your fork, so we can review your submission:

https://github.com/davidbebb
https://github.com/RichUnibuddy
https://github.com/anlauren

We encourage pair programming, but do want the exercise to be fair, so please make sure you can complete the exercise solo and explain your work. 

## Part 1

The service fails to start - ```npm run start:dev``` -  Use the messages to fix the code, so that the service runs successfully

## Solution Explanation

When I first ran the ```npm run start: dev``` - it ran into an error on line 131.

![Screenshot 2024-07-08 143835](https://github.com/horiaomar25/TheMealApp/assets/140801006/a5dcacba-ee61-4f6f-aedf-86360aa1dbfd)

To resolve this, it meant that function was missing a expilict return statement. 

## Part 2

A test is failing - ```npm run test``` - impolement the code necessary to pass the test

I was able to resolve this by adjusting the delelete function in message.data.ts.  

## Part 3 - Strech

Currently, we allow tags to be added to a conversation, so we can help users to find things they're interested in.

We would like to extend the functionality, to allow the sender of a message to add or update tags on a single message, and allow other users to find messages based on these tags.

While we don't expect everyone to complete this part of the exercise, it will form the basis of disucssion in an interview. Please make as much progress with this, as you feel comfortable doing. Don't allow it to be all-consuming. A couple of hours at most for all parts of the exercise. 

We'd love to hear about
* How you would go about implementing the solution
* What problems you might encounter
* How you would go about testing
* What you might do differently

# Implementation

### 1. Adding Tags to a single message

To handle adding tags to a single message, I looked into the ```message/models``` folder. In the ```message.model.ts``` file, there is a ```ChatMessageModel``` Schema. The ```ChatMessageModel``` Schema defines the core properites of a chat message. Adding the ```tags``` property will hold an array of strings representing tag IDs.

```
@Prop({ type[String] })
tags?: string[];
```
This addition allows each chat message to have an optional ```tags``` property if the sender chooses to add them to their message. 

The next step I would then take is to go the ```message.data.ts``` and modify the ```createMessage``` function. In this function, I will add the tags property to handle tags data if provided.Following the exsisting structure of other properties in the function, I can add the `tags` property as follows:

```
chatMessage.tags = tags?[]: string[] || []
```
This should enable to adding of tags when a sender write a message. 

### 2. Updating Tags on single message

Exploring the ```message.data.ts``` file, I saw the resolver function that seems to deal with the status of a message to resolved. This function follows updating the logic of the message. I would follow similiar structure in the dealing updating tag on a single message.

In the ```message.data.ts``` I would add a ```updateMessageTags``` function to apply this functionality.

```
async updateTags(messageId: ObjectID, updatedTags: string[]): Promise<ChatMessage>{
    const filterBy = { _id: messageId };
    const updateProperty = { $set: {tags: [...updatedTags] } };
    const updatedResult = await this.chatMessageModel.findOneAndUpdate(
        filterBy, updatedProperty,
        {new: true, returnOriginal: false}
    );

    if(!updatedResult) {
        throw new Error('Failed to update tags for message:' $messageId);
    }

    return chatMessageToObject(updatedResult);
}
```
I would use mongoDB ```$set``` operator and ES6 spread operator as we are dealing with a array of tags. So when we update the tags, it will stick return the exsisting tags that may be associated with the message as well as the update tag. 

Overall, this should deal with the ability to update tags on a single message. 

### 3. Finding Messages

I would also implement this in the ```message.data.ts```. In order to filter through the tags with search we need a query. To do this, I looked into MongoDB documentation [here](https://mongoosejs.com/docs/queries.html). In looking through this documentation I would use ```Model.find``` to filter and use ```$in``` to search for messages where the tags array contains at least one of the provided tags in the search query.

```
async function findMessagesByTags(tags: string[]): Promise<ChatMessage[]> {
  return this.chatMessageModel.find({ tags: { $in: tags } });
}
```

### 4. What problems you might encounter

1. Adding a new tags property might require a migration, potentially causing downtime or data inconsistencies.

2. Filtering through a large dataset especially with tags now added to single messages rather than just at the beginning of the creation of the conversation.

### 5. Testing

1. In ```message.data.spec.ts```, I would test if tags are provided in a single message. 

2. I would also test if the tags are updated using mock data. 

### 6. What you might do differently
 
 I would perphaps consider create a seperate file to deal with tag management so I could later extend of perphap deleting tags. 
 
 This may easier for readability, maintainability, and future extensibility.

### Submission
@davidbebb
@RichUnibuddy
@anlauren
