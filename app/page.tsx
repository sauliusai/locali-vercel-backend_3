export default function Home() {
  return (
    <main style={{padding:20,fontFamily:'system-ui'}}>
      <h1>Locali Backend</h1>
      <p>API routes:</p>
      <ul>
        <li>/api/translate-text</li>
        <li>/api/translate-image</li>
        <li>/api/translate-email</li>
      </ul>
    </main>
  );
}
