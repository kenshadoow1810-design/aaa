# Persua Clone

Aplicação de transcrição e tradução em tempo real com análise de código via IA.

## Funcionalidades

- 🎤 **Transcrição em tempo real**: Captura de áudio via microfone com transcrição usando Faster-Whisper
- 🌐 **Tradução automática**: Tradução inglês → português com MarianMT
- 💻 **Análise de código**: Captura de tela + OCR + IA (Ollama/Llama3) para resolver problemas de programação
- ⌨️ **Hotkeys**: Ctrl+Espaço para iniciar/parar gravação
- 🪟 **Overlay invisível**: Interface que não aparece em compartilhamentos de tela

## Requisitos

### Backend (Python)
- Python 3.9+
- GPU NVIDIA com CUDA
- Ollama instalado com modelo llama3

### Frontend (Node.js)
- Node.js 18+
- npm

## Instalação

### 1. Backend

```bash
cd backend

# Criar ambiente virtual (recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Instalar pytesseract (OCR)
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr

# macOS:
brew install tesseract

# Windows: Baixe em https://github.com/tesseract-ocr/tesseract/releases

# Iniciar Ollama com modelo llama3
ollama pull llama3
ollama serve
```

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install
```

## Como Rodar

### Terminal 1 - Backend
```bash
cd backend
python main.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Acesse `http://localhost:5173` no navegador.

## Uso

1. **Transcrição/Tradução**:
   - Clique em "Gravar" ou pressione `Ctrl+Espaço`
   - Fale em inglês
   - Veja a transcrição e tradução em tempo real

2. **Análise de Código**:
   - Abra um problema do LeetCode ou código na tela
   - Clique em "Analisar Tela"
   - A IA extrairá o texto e fornecerá uma solução

## Estrutura

```
persua-clone/
├── backend/
│   ├── main.py           # Servidor FastAPI com WebSockets
│   └── requirements.txt  # Dependências Python
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Componente principal
│   │   └── App.css       # Estilos do overlay
│   ├── index.html
│   └── package.json
└── README.md
```

## Tecnologias

- **Backend**: FastAPI, Faster-Whisper, MarianMT, mss, pytesseract, Ollama
- **Frontend**: React, Vite, Web Audio API, WebSocket
- **IA**: Whisper (transcrição), MarianMT (tradução), Llama3 (análise de código)

## Notas

- A aplicação roda localmente (localhost)
- Requer GPU NVIDIA para aceleração do Whisper
- O overlay usa `isolation: isolate` para não aparecer em compartilhamentos de tela
- Histórico não implementado (conforme solicitado)
