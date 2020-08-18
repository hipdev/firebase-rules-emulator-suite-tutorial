## This is based in the recent tutorials from the great Todd Kerpelman on Youtube

So you can just follow the tutorials without writing, is a bit hard to follow without to much time.

First part [Unit testing security rules with the Firebase Emulator Suite](https://www.youtube.com/watch?v=VDulvfBpzZE).  
Second part [Intermediate topics in Firebase Security Rules](https://www.youtube.com/watch?v=8Mzb9zmnbJs).

### Steps to reproduce

Clone the repo, then don't be lazy and check the tutorials from Youtube :v

### Start firestore emulator

`firebase emulators:start --only firestore`

### Run tests

in the test directory run: `npm test`

#### Some notes

**request.resource.data**: The data who is been sending to db  
**resource.data**: Data who is already in the db
