const assert = require('assert');
const firebase = require('@firebase/testing');

const MY_PROJECT_ID = 'emulator-rules';
const myId = 'user_abc';
const theirId = 'user_xyz';
const modId = 'user_mod';
const myAuth = { uid: myId, email: 'abc@gmail.com' };
const modAuth = { uid: modId, email: 'mod@gmail.com', isModerator: true };

function getFirestore(auth) {
  return firebase
    .initializeTestApp({ projectId: MY_PROJECT_ID, auth: auth })
    .firestore();
}

function getAdminFirestore() {
  return firebase.initializeAdminApp({ projectId: MY_PROJECT_ID }).firestore();
}

beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
});

describe('Our social app', () => {
  it('Understands basic addition', () => {
    assert.equal(2 + 2, 4);
  });

  it('Can read items in the read-only collection', async () => {
    const db = getFirestore(null);

    const testDoc = db.collection('readonly').doc('testDoc');

    await firebase.assertSucceeds(testDoc.get());
  });

  it("Can't write items in the read-only collection", async () => {
    // const db = firebase
    // .initializeTestApp({ projectId: MY_PROJECT_ID })
    // .firestore();

    const db = getFirestore(null);

    const testDoc = db.collection('readonly').doc('testDoc2');

    await firebase.assertFails(testDoc.set({ foo: 'bar' }));
  });

  it('Can write to a user document with the same ID as our user', async () => {
    const db = getFirestore(myAuth);

    const testDoc = db.collection('users').doc('user_abc');

    await firebase.assertSucceeds(testDoc.set({ foo: 'bar' }));
  });

  it("Can't write to a user document with a different ID as our user", async () => {
    const db = getFirestore(myAuth);

    const testDoc = db.collection('users').doc(theirId);

    await firebase.assertFails(testDoc.set({ foo: 'bar' }));
  });

  it("Can't write to a user document with a different ID as our user", async () => {
    const db = getFirestore(myAuth);

    const testDoc = db.collection('users').doc(theirId);

    await firebase.assertFails(testDoc.set({ foo: 'bar' }));
  });

  // POSTS

  it('Can read posts marked public', async () => {
    const db = getFirestore(null);

    const testQuery = db
      .collection('posts')
      .where('visibility', '==', 'public');

    await firebase.assertSucceeds(testQuery.get());
  });

  it('Can query personal posts', async () => {
    const db = getFirestore(myAuth);

    const testQuery = db.collection('posts').where('authorId', '==', myId);

    await firebase.assertSucceeds(testQuery.get());
  });

  it('Cant Query all posts', async () => {
    const db = getFirestore(myAuth);

    const testQuery = db.collection('posts');

    await firebase.assertFails(testQuery.get());
  });

  it('Can read a single public post', async () => {
    const admin = getAdminFirestore();

    const postId = 'public_post';
    const setupDoc = admin.collection('posts').doc(postId);

    await setupDoc.set({ authorId: theirId, visibility: 'public' });

    const db = getFirestore(null);
    const testRead = db.collection('posts').doc(postId);
    await firebase.assertSucceeds(testRead.get());
  });

  it('Cant read a private post beloning to another user', async () => {
    const admin = getAdminFirestore();

    const postId = 'private_post';
    const setupDoc = admin.collection('posts').doc(postId);

    await setupDoc.set({ authorId: theirId, visibility: 'private' });

    const db = getFirestore(myAuth);
    const testRead = db.collection('posts').doc(postId);
    await firebase.assertFails(testRead.get());
  });

  it('Allow a user to edit their own post', async () => {
    const postId = 'post123';
    const admin = getAdminFirestore();

    await admin
      .collection('posts')
      .doc(postId)
      .set({ content: 'before', authorId: myId });

    const db = getFirestore(myAuth);

    const testDoc = db.collection('posts').doc(postId);

    await firebase.assertSucceeds(testDoc.update({ content: 'after' }));
  });

  it('Dont Allow a user to edit somebody else post', async () => {
    const postId = 'post123';
    const admin = getAdminFirestore();

    await admin
      .collection('posts')
      .doc(postId)
      .set({ content: 'before', authorId: theirId });

    const db = getFirestore(myAuth);

    const testDoc = db.collection('posts').doc(postId);

    await firebase.assertFails(testDoc.update({ content: 'after' }));
  });

  it('Allows a moderator to edit somebody else post', async () => {
    const postId = 'post123';
    const admin = getAdminFirestore();

    await admin
      .collection('posts')
      .doc(postId)
      .set({ content: 'before', authorId: theirId });

    const db = getFirestore(modAuth);

    const testDoc = db.collection('posts').doc(postId);

    await firebase.assertSucceeds(testDoc.update({ content: 'after' }));
  });

  // Rooms

  it('Allow a user to edit their own room post', async () => {
    const postPath = '/rooms/room_abc/posts/post_123';
    const admin = getAdminFirestore();

    await admin.doc(postPath).set({ content: 'before', authorId: myId });

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertSucceeds(testDoc.update({ content: 'after' }));
  });

  it("Won't allow a user to edit somebody else room post", async () => {
    const postPath = '/rooms/room_abc/posts/post_123';
    const admin = getAdminFirestore();

    await admin.doc(postPath).set({ content: 'before', authorId: theirId });

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertFails(testDoc.update({ content: 'after' }));
  });

  it("Allow a room mod to edit another person's room post", async () => {
    const roomPath = 'rooms/room_abc';
    const postPath = `${roomPath}/posts/post_123`;

    const admin = getAdminFirestore();

    await admin.doc(roomPath).set({
      topic: 'Unit testers',
      roomMods: [myId, 'dummyUser'],
      authorId: myId,
    });

    await admin.doc(postPath).set({ content: 'Before', authorId: theirId });

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertSucceeds(testDoc.update({ content: 'after' }));
  });

  // Test with resource object

  it('Allows a user to create a post when they list themselves as the author', async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertSucceeds(
      testDoc.set({
        authorId: myId,
        content: 'lorem ipsum',
        visibility: 'public',
        headline: 'headline',
      })
    );
  });

  it("Doesn't let a user to create a post when they list somebody else as the author", async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertFails(
      testDoc.set({ authorId: theirId, content: 'lorem ipsum' })
    );
  });

  it("Doesn't let a user to create a post when they list somebody else as the author", async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertFails(
      testDoc.set({ authorId: theirId, content: 'lorem ipsum' })
    );
  });

  it('Can create a post with all the required fields', async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertSucceeds(
      testDoc.set({
        authorId: myId,
        content: 'lorem ipsum',
        visibility: 'public',
        headline: 'headline',
      })
    );
  });

  it("Can't create a post missing some required fields", async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertFails(
      testDoc.set({ authorId: myId, headline: 'headline' })
    );
  });

  it('Can create a post with all the required and optional fields', async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertSucceeds(
      testDoc.set({
        authorId: myId,
        content: 'lorem ipsum',
        visibility: 'public',
        headline: 'headline',
        location: 'San Francisco',
        tags: ['screencasts', 'firebase'],
        photo: 'url_goes_here',
      })
    );
  });

  it("Can't create a post with an unapproved fields", async () => {
    const postPath = '/posts/post123';

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertFails(
      testDoc.set({
        authorId: myId,
        headline: 'headline',
        content: 'lorem ipsum',
        visibility: 'public',
        not_allowed: true,
      })
    );
  });

  it('Can edit a post with allowed fields', async () => {
    const postPath = '/posts/post123';

    const admin = getAdminFirestore();

    await admin.doc(postPath).set({
      content: 'before',
      authorId: myId,
      headline: 'before_headline',
      visibility: 'public',
    });

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertSucceeds(
      testDoc.update({
        content: 'after_content',
      })
    );
  });

  it("Can't edit a post's forbidden fields", async () => {
    const postPath = '/posts/post123';

    const admin = getAdminFirestore();

    await admin.doc(postPath).set({
      content: 'before',
      authorId: myId,
      headline: 'before_headline',
      visibility: 'public',
    });

    const db = getFirestore(myAuth);

    const testDoc = db.doc(postPath);

    await firebase.assertFails(
      testDoc.update({
        content: 'after_content',
        headline: 'after_headline',
      })
    );
  });
});

after(async () => {
  await firebase.clearFirestoreData({ projectId: MY_PROJECT_ID });
});
