import asyncio
import json
import base64
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel
from transformers import MarianMTModel, MarianTokenizer
import mss
import mss.tools
import pytesseract
from PIL import Image
import ollama
import io

app = FastAPI()

# Carregar modelos no início
print("Carregando modelo Whisper...")
whisper_model = WhisperModel("large-v3", device="cuda", compute_type="float16")
print("Modelo Whisper carregado!")

print("Carregando modelo MarianMT...")
translator_name = "Helsinki-NLP/opus-mt-en-pt"
translator_tokenizer = MarianTokenizer.from_pretrained(translator_name)
translator_model = MarianMTModel.from_pretrained(translator_name)
print("Modelo MarianMT carregado!")

def translate_text(text):
    """Traduz texto de inglês para português"""
    if not text.strip():
        return ""
    inputs = translator_tokenizer(text, return_tensors="pt", padding=True)
    generated = translator_model.generate(**inputs)
    return translator_tokenizer.decode(generated[0], skip_special_tokens=True)

def capture_screen():
    """Captura a tela atual"""
    with mss.mss() as sct:
        monitor = sct.monitors[0]  # Tela inteira
        screenshot = sct.grab(monitor)
        img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
        return img

def extract_code_from_screen():
    """Extrai texto/código da tela usando OCR"""
    img = capture_screen()
    # Usar pytesseract para extrair texto
    text = pytesseract.image_to_string(img, lang='eng')
    return text

async def analyze_code_with_ollama(code_text):
    """Analisa código usando Ollama (modelo local)"""
    if not code_text.strip():
        return "Nenhum código detectado na tela."
    
    prompt = f"""Você é um assistente especializado em resolver problemas de programação. 
Analise o seguinte código ou problema extraído da tela e forneça uma solução clara e explicada:

{code_text}

Forneça:
1. Explicação do problema
2. Solução em código (se aplicável)
3. Explicação da solução"""

    try:
        response = ollama.chat(model='llama3', messages=[{'role': 'user', 'content': prompt}])
        return response['message']['content']
    except Exception as e:
        return f"Erro ao analisar código: {str(e)}. Certifique-se de que o Ollama está rodando com o modelo llama3."

@app.websocket("/ws/audio")
async def websocket_audio(websocket: WebSocket):
    await websocket.accept()
    
    audio_buffer = bytearray()
    
    try:
        while True:
            # Receber dados de áudio em base64
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio_chunk":
                audio_data = base64.b64decode(message["data"])
                audio_buffer.extend(audio_data)
                
                # Processar após acumular ~5 segundos de áudio (ajustável)
                if len(audio_buffer) > 160000 * 5:  # ~5 segundos a 16kHz
                    # Converter para numpy array
                    audio_np = np.frombuffer(audio_buffer, dtype=np.float32)
                    
                    # Transcrever
                    segments, info = whisper_model.transcribe(
                        audio_np, 
                        language="en",
                        beam_size=5,
                        vad_filter=True
                    )
                    
                    transcription = " ".join([segment.text for segment in segments])
                    
                    # Traduzir
                    if transcription.strip():
                        translation = translate_text(transcription)
                        
                        # Enviar de volta
                        await websocket.send_json({
                            "type": "transcription",
                            "text": transcription,
                            "translation": translation
                        })
                    
                    audio_buffer = bytearray()  # Limpar buffer
            
            elif message.get("type") == "analyze_screen":
                # Capturar e analisar tela
                screen_text = extract_code_from_screen()
                analysis = await analyze_code_with_ollama(screen_text)
                
                await websocket.send_json({
                    "type": "screen_analysis",
                    "text": screen_text,
                    "analysis": analysis
                })
                
    except WebSocketDisconnect:
        print("Cliente desconectado")

@app.websocket("/ws/screen")
async def websocket_screen(websocket: WebSocket):
    """WebSocket dedicado para captura de tela sob demanda"""
    await websocket.accept()
    
    try:
        while True:
            # Aguardar solicitação de captura
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "capture":
                img = capture_screen()
                
                # Converter para base64
                buffered = io.BytesIO()
                img.save(buffered, format="PNG")
                img_base64 = base64.b64encode(buffered.getvalue()).decode()
                
                await websocket.send_json({
                    "type": "screenshot",
                    "image": img_base64
                })
                
    except WebSocketDisconnect:
        print("Cliente de tela desconectado")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
