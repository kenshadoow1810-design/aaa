import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [translation, setTranslation] = useState('')
  const [screenAnalysis, setScreenAnalysis] = useState('')
  const [screenText, setScreenText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const audioWebSocketRef = useRef(null)
  const screenWebSocketRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)

  const connectAudioWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8000/ws/audio')
    
    ws.onopen = () => console.log('Conectado ao WebSocket de áudio')
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'transcription') {
        setTranscription(message.text)
        setTranslation(message.translation)
      } else if (message.type === 'screen_analysis') {
        setScreenText(message.text)
        setScreenAnalysis(message.analysis)
        setIsAnalyzing(false)
      }
    }
    
    ws.onerror = (error) => console.error('Erro no WebSocket de áudio:', error)
    ws.onclose = () => console.log('WebSocket de áudio desconectado')
    
    audioWebSocketRef.current = ws
  }

  const connectScreenWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8000/ws/screen')
    ws.onopen = () => console.log('Conectado ao WebSocket de tela')
    ws.onerror = (error) => console.error('Erro no WebSocket de tela:', error)
    ws.onclose = () => console.log('WebSocket de tela desconectado')
    screenWebSocketRef.current = ws
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      if (!audioWebSocketRef.current) connectAudioWebSocket()
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        const float32Array = new Float32Array(inputData)
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(float32Array.buffer)))
        
        if (audioWebSocketRef.current?.readyState === WebSocket.OPEN) {
          audioWebSocketRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            data: base64Audio
          }))
        }
      }
      
      source.connect(processor)
      processor.connect(audioContextRef.current.destination)
      
      mediaRecorderRef.current = { stream, processor, source }
      setIsRecording(true)
    } catch (err) {
      console.error('Erro ao acessar microfone:', err)
      alert('Não foi possível acessar o microfone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      const { stream, processor, source } = mediaRecorderRef.current
      processor.disconnect()
      source.disconnect()
      stream.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsRecording(false)
  }

  const toggleRecording = () => isRecording ? stopRecording() : startRecording()

  const analyzeScreen = () => {
    if (!screenWebSocketRef.current) connectScreenWebSocket()
    
    setIsAnalyzing(true)
    setScreenAnalysis('')
    setScreenText('')
    
    if (audioWebSocketRef.current?.readyState === WebSocket.OPEN) {
      audioWebSocketRef.current.send(JSON.stringify({ type: 'analyze_screen' }))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        toggleRecording()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording])

  useEffect(() => {
    return () => {
      stopRecording()
      audioWebSocketRef.current?.close()
      screenWebSocketRef.current?.close()
    }
  }, [])

  return (
    <div className="overlay-container">
      <div className="overlay-window">
        <h1>Persua Clone</h1>
        
        <div className="controls">
          <button 
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
          >
            {isRecording ? '⏹ Parar (Ctrl+Espaço)' : '▶ Gravar (Ctrl+Espaço)'}
          </button>
          
          <button 
            className="analyze-button"
            onClick={analyzeScreen}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '🔍 Analisando...' : '📸 Analisar Tela'}
          </button>
        </div>

        <div className="content-area">
          <div className="section">
            <h2>🎤 Transcrição (Inglês)</h2>
            <div className="text-box">{transcription || 'Aguardando áudio...'}</div>
          </div>

          <div className="section">
            <h2>🌐 Tradução (Português)</h2>
            <div className="text-box">{translation || 'Aguardando tradução...'}</div>
          </div>

          <div className="section">
            <h2>💻 Análise de Código</h2>
            <div className="text-box small">
              <strong>Texto extraído:</strong>
              <pre>{screenText || 'Nenhum texto extraído'}</pre>
            </div>
            <div className="text-box">
              <strong>Análise IA:</strong>
              <pre>{screenAnalysis || 'Clique em "Analisar Tela" para extrair e analisar código'}</pre>
            </div>
          </div>
        </div>

        <div className="instructions">
          <p><strong>Instruções:</strong></p>
          <ul>
            <li>Pressione <code>Ctrl+Espaço</code> ou clique em "Gravar" para iniciar/parar</li>
            <li>Clique em "Analisar Tela" para capturar e analisar código</li>
            <li>O overlay não aparece em compartilhamentos de tela</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
