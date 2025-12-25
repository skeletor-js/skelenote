import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LoroDocStore } from '@/lib/loro/store';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [loroStatus, setLoroStatus] = useState('Not initialized');
  const [store] = useState(() => new LoroDocStore());

  useEffect(() => {
    // Initialize Loro store on mount
    store
      .initialize()
      .then(() => setLoroStatus('Loro initialized successfully'))
      .catch((err) => setLoroStatus(`Loro error: ${err}`));
  }, [store]);

  async function testTauriCommand() {
    try {
      const result = await invoke<string>('greet', { name: 'Ephemera' });
      setGreetMsg(result);
    } catch (error) {
      setGreetMsg(`Error: ${error}`);
    }
  }

  async function testLoroPersistence() {
    try {
      // Create a test document
      const doc = store.createDocument('test-doc');
      const text = doc.getText('content');
      text.insert(0, 'Hello from Loro!');

      // Save to disk
      await store.save();
      setLoroStatus('Loro document saved to disk');
    } catch (error) {
      setLoroStatus(`Loro save error: ${error}`);
    }
  }

  async function loadLoroDocument() {
    try {
      await store.load();
      const doc = store.getDocument('test-doc');
      if (doc) {
        const text = doc.getText('content');
        setLoroStatus(`Loaded document content: "${text.toString()}"`);
      } else {
        setLoroStatus('No saved document found');
      }
    } catch (error) {
      setLoroStatus(`Loro load error: ${error}`);
    }
  }

  return (
    <div
      style={{
        padding: 'var(--spacing-xl)',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>Ephemera</h1>

      <section
        style={{
          marginBottom: 'var(--spacing-xl)',
          padding: 'var(--spacing-md)',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem' }}>
          Tauri Command Test
        </h2>
        <button onClick={testTauriCommand}>Test Tauri Command</button>
        {greetMsg && (
          <p
            style={{
              marginTop: 'var(--spacing-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {greetMsg}
          </p>
        )}
      </section>

      <section
        style={{
          padding: 'var(--spacing-md)',
          background: 'var(--bg-raised)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem' }}>
          Loro CRDT Test
        </h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button onClick={testLoroPersistence}>Create & Save</button>
          <button onClick={loadLoroDocument}>Load Document</button>
        </div>
        <p
          style={{
            marginTop: 'var(--spacing-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          Status: {loroStatus}
        </p>
      </section>
    </div>
  );
}

export default App;
