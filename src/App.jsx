// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { uploadData, getUrl } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';

import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Configure Amplify with generated outputs
Amplify.configure(outputs);

// Generate the data client (for Notes model)
const client = generateClient();

export default function App() {
  const [notes, setNotes] = useState([]);
  const [noteData, setNoteData] = useState({ name: '', description: '' });
  const [image, setImage] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Fetch all notes
  async function fetchNotes() {
    const result = await client.models.Note.list();
    const notesWithUrls = await Promise.all(
      result.data.map(async note => {
        if (note.image) {
          note.imageUrl = (await getUrl({ key: note.image })).url;
        }
        return note;
      })
    );
    setNotes(notesWithUrls);
  }

  // Create a new note
  async function createNote(event) {
    event.preventDefault();

    if (!noteData.name || !noteData.description) return;

    let imageKey;
    if (image) {
      const { username } = await getCurrentUser();
      const extension = image.name.split('.').pop();
      imageKey = `images/${username}/${Date.now()}.${extension}`;
      await uploadData({
        key: imageKey,
        data: image,
        options: { contentType: image.type },
      }).result;
    }

    await client.models.Note.create({
      name: noteData.name,
      description: noteData.description,
      image: imageKey,
    });

    setNoteData({ name: '', description: '' });
    setImage(null);
    fetchNotes();
  }

  // Delete a note
  async function deleteNote(note) {
    await client.models.Note.delete(note.id);
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main>
          <h1>Hello {user.username}</h1>
          <button onClick={signOut}>Sign out</button>

          <h2>Create Note</h2>
          <form onSubmit={createNote}>
            <input
              placeholder="Note name"
              value={noteData.name}
              onChange={(e) => setNoteData({ ...noteData, name: e.target.value })}
            />
            <input
              placeholder="Note description"
              value={noteData.description}
              onChange={(e) => setNoteData({ ...noteData, description: e.target.value })}
            />
            <input
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
            />
            <button type="submit">Create Note</button>
          </form>

          <h2>My Notes</h2>
          {notes.map(note => (
            <div key={note.id}>
              <h3>{note.name}</h3>
              <p>{note.description}</p>
              {note.imageUrl && <img src={note.imageUrl} alt={note.name} style={{ width: 200 }} />}
              <button onClick={() => deleteNote(note)}>Delete Note</button>
            </div>
          ))}
        </main>
      )}
    </Authenticator>
  );
}
