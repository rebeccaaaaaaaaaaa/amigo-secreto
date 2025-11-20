import { useState, useEffect } from 'react'
import './App.css'

interface Participant {
  name: string;
}

interface DrawResult {
  giver: string;
  receiver: string;
  code: string;
}

type AppMode = 'setup' | 'codes' | 'reveal';

function App() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentName, setCurrentName] = useState('')
  const [mode, setMode] = useState<AppMode>('setup')
  const [drawResults, setDrawResults] = useState<DrawResult[]>([])
  const [inputCode, setInputCode] = useState('')
  const [revealedResult, setRevealedResult] = useState<string | null>(null)
  const [revealedPerson, setRevealedPerson] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Carregar sorteio ao iniciar (de URL ou localStorage)
  useEffect(() => {
    // Primeiro tenta carregar da URL (tem prioridade)
    const urlHash = window.location.hash.substring(1)
    if (urlHash) {
      try {
        const decoded = atob(urlHash)
        const data = JSON.parse(decoded)
        setDrawResults(data.results)
        setMode('reveal')
        // Salva no localStorage também
        localStorage.setItem('amigoSecreto', JSON.stringify(data))
        return
      } catch (e) {
        console.error('Erro ao decodificar URL', e)
      }
    }

    // Se não tem na URL, tenta carregar do localStorage
    const savedDraw = localStorage.getItem('amigoSecreto')
    if (savedDraw) {
      const data = JSON.parse(savedDraw)
      setDrawResults(data.results)
      setMode('reveal')
    }
  }, [])

  // Gerar código aleatório de 6 caracteres
  const generateCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Remove letras/números confusos
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const addParticipant = () => {
    if (currentName.trim() && !participants.find(p => p.name.toLowerCase() === currentName.toLowerCase())) {
      setParticipants([...participants, { name: currentName.trim() }])
      setCurrentName('')
    }
  }

  const removeParticipant = (name: string) => {
    setParticipants(participants.filter(p => p.name !== name))
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  const performDraw = () => {
    if (participants.length < 3) {
      alert('É necessário no mínimo 3 participantes!')
      return
    }

    let validDraw = false
    let attempts = 0
    let shuffled: Participant[] = []

    // Tenta criar um sorteio válido (ninguém tira a si mesmo)
    while (!validDraw && attempts < 100) {
      shuffled = shuffleArray(participants)
      validDraw = participants.every((p, index) => p.name !== shuffled[index].name)
      attempts++
    }

    if (!validDraw) {
      alert('Não foi possível realizar o sorteio. Tente novamente.')
      return
    }

    // Gerar códigos únicos
    const usedCodes = new Set<string>()
    const results: DrawResult[] = participants.map((p, index) => {
      let code = generateCode()
      while (usedCodes.has(code)) {
        code = generateCode()
      }
      usedCodes.add(code)
      
      return {
        giver: p.name,
        receiver: shuffled[index].name,
        code: code
      }
    })

    setDrawResults(results)
    
    // Salvar no localStorage
    const data = { results }
    localStorage.setItem('amigoSecreto', JSON.stringify(data))
    
    // Gerar URL compartilhável
    const encoded = btoa(JSON.stringify(data))
    window.location.hash = encoded
    
    setMode('codes')
  }

  const revealByCode = () => {
    if (!inputCode.trim()) {
      alert('Por favor, digite seu código!')
      return
    }

    const result = drawResults.find(r => r.code.toUpperCase() === inputCode.toUpperCase())
    if (result) {
      setRevealedResult(result.receiver)
      setRevealedPerson(result.giver)
      setInputCode('')
    } else {
      alert('Código inválido! Verifique e tente novamente.')
      setInputCode('')
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const copyAllCodes = () => {
    const text = drawResults.map(r => `${r.giver}: ${r.code}`).join('\n')
    navigator.clipboard.writeText(text)
    alert('Todos os códigos foram copiados!')
  }

  const copyShareLink = () => {
    const link = window.location.href
    navigator.clipboard.writeText(link)
    alert('Link copiado! Compartilhe com os participantes para que cada um possa revelar seu amigo secreto.')
  }

  const printCodes = () => {
    window.print()
  }

  const resetAll = () => {
    if (confirm('Tem certeza que deseja começar um novo sorteio? Isso apagará o sorteio atual.')) {
      setParticipants([])
      setCurrentName('')
      setMode('setup')
      setDrawResults([])
      setInputCode('')
      setRevealedResult(null)
      setRevealedPerson(null)
      localStorage.removeItem('amigoSecreto')
      // Limpar a URL também
      window.location.hash = ''
    }
  }

  const backToReveal = () => {
    setRevealedResult(null)
    setRevealedPerson(null)
  }

  return (
    <div className="app">
      <div className="container">
        <h1>🎁 Amigo Secreto</h1>

        {/* MODO: ADICIONAR PARTICIPANTES */}
        {mode === 'setup' && (
          <div className="setup-section">
            <div className="add-participant">
              <input
                type="text"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="Digite o nome do participante"
                className="input-field"
              />
              <button onClick={addParticipant} className="btn btn-add">
                Adicionar
              </button>
            </div>

            <div className="participants-list">
              <h2>Participantes ({participants.length})</h2>
              {participants.length > 0 && participants.length < 3 && (
                <p className="warning-message">⚠️ Adicione pelo menos {3 - participants.length} participante(s) para realizar o sorteio</p>
              )}
              {participants.length === 0 ? (
                <p className="empty-message">Nenhum participante adicionado ainda</p>
              ) : (
                <ul>
                  {participants.map((p) => (
                    <li key={p.name}>
                      <span>{p.name}</span>
                      <button
                        onClick={() => removeParticipant(p.name)}
                        className="btn-remove"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {participants.length >= 3 && (
              <button onClick={performDraw} className="btn btn-primary">
                🎲 Realizar Sorteio
              </button>
            )}
          </div>
        )}

        {/* MODO: MOSTRAR CÓDIGOS */}
        {mode === 'codes' && (
          <div className="codes-section">
            <div className="info-box">
              <p>✓ Sorteio realizado com sucesso!</p>
              <p><strong>Distribua os códigos:</strong> Cada pessoa deve anotar ou copiar seu código exclusivo.</p>
              <p>⚠️ Depois, cada um deve acessar sozinho e digitar seu código para revelar.</p>
            </div>

            <div className="codes-list-container">
              <h2>Códigos dos Participantes</h2>
              <div className="codes-list">
                {drawResults.map((result) => (
                  <div key={result.code} className="code-item">
                    <div className="code-person">{result.giver}</div>
                    <div className="code-value">{result.code}</div>
                    <button 
                      onClick={() => copyCode(result.code)} 
                      className="btn-copy"
                      title="Copiar código"
                    >
                      {copiedCode === result.code ? '✓' : '📋'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="share-link-box">
              <p>🔗 <strong>Compartilhe este link</strong> com todos os participantes:</p>
              <div className="share-link-container">
                <input 
                  type="text" 
                  value={window.location.href} 
                  readOnly 
                  className="share-link-input"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button onClick={copyShareLink} className="btn btn-copy-link">
                  Copiar Link
                </button>
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={copyAllCodes} className="btn btn-secondary">
                📋 Copiar Todos
              </button>
              <button onClick={printCodes} className="btn btn-secondary">
                🖨️ Imprimir
              </button>
            </div>

            <button onClick={() => setMode('reveal')} className="btn btn-primary">
              Continuar para Revelação
            </button>
          </div>
        )}

        {/* MODO: REVELAR AMIGO SECRETO */}
        {mode === 'reveal' && (
          <div className="reveal-section">
            {!revealedResult ? (
              <>
                <div className="welcome-box">
                  <h2>Bem-vindo ao Sorteio! 🎁</h2>
                  <p>Já existe um sorteio ativo. Digite seu código para revelar quem você tirou.</p>
                  <p>Se você é o organizador e quer <strong>criar um novo sorteio</strong>, clique em "Novo Sorteio" abaixo.</p>
                </div>

                <div className="info-box">
                  <p>🔐 Digite seu código para descobrir quem você tirou!</p>
                  <p>Cada pessoa deve fazer isso sozinha, sem que ninguém veja.</p>
                </div>

                <div className="code-input-container">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && revealByCode()}
                    placeholder="Digite seu código (6 caracteres)"
                    className="input-field code-input"
                    maxLength={6}
                  />
                  <button onClick={revealByCode} className="btn btn-reveal">
                    👁️ Revelar
                  </button>
                </div>

                <button onClick={resetAll} className="btn btn-secondary" style={{marginTop: '2rem'}}>
                  Novo Sorteio
                </button>
              </>
            ) : (
              <div className="result-revealed">
                <div className="result-box">
                  <h3>{revealedPerson}, você tirou:</h3>
                  <div className="revealed-name">🎁 {revealedResult}</div>
                  <p className="warning">⚠️ Não conte para ninguém!</p>
                </div>

                <button onClick={backToReveal} className="btn btn-primary">
                  Voltar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
