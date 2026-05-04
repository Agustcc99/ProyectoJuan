function AuthCard({ titulo, subtitulo, children }) {
  return (
    <main className="auth-page">
      <section className="auth-container">
        <header className="auth-header">
          <div className="auth-header-content">
            <span className="auth-badge">Sistema odontológico</span>

            <div>
              <h1 className="auth-header-title">
                Consultorio Odontológico Herrera
              </h1>
              <p className="auth-header-subtitle">
                Acceso seguro al sistema de gestión
              </p>
            </div>
          </div>
        </header>

        <div className="auth-panel-form">
          <div className="auth-form-header">
            <h2>{titulo}</h2>
            <p>{subtitulo}</p>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}

export default AuthCard;