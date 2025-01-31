import { Ollama } from 'ollama';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Starting FastCodeR1!');

	const disposable = vscode.commands.registerCommand('fastcoder1.start', () => {
		const panel = vscode.window.createWebviewPanel(
			'FastCodeR1',
			'FastCodeR1',
			vscode.ViewColumn.One,
			{enableScripts: true}
		);

		panel.webview.html = getWebviewContent();

		let ollama = new Ollama;
        let isProcessing = false;

		panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === 'chat' && !isProcessing) {
                isProcessing = true;
                const userPrompt = message.text;

                try {
                    const streamResponse = await ollama.chat({
                        model: 'deepseek-r1:1.5b',
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });

                    let fullResponse = '';
                    for await (const part of streamResponse) {
                        fullResponse += part.message.content;
                        panel.webview.postMessage({
                            command: 'chatResponse',
                            text: fullResponse,
                            isFinal: false
                        });
                    }

                    panel.webview.postMessage({
                        command: 'chatResponse',
                        text: fullResponse,
                        isFinal: true
                    });
                } catch (err) {
                    panel.webview.postMessage({
                        command: 'chatResponse',
                        text: `Error: ${String(err)}`,
                        isFinal: true
                    });
                } finally {
                    isProcessing = false;
                }
            }
        });
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string{
	return /*html*/`
		<!DOCTYPE html>
		<html lang = "en">
		<head>
			<meta charset = "UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                :root {
                    --bg-color: var(--vscode-editor-background);
                    --text-color: var(--vscode-editor-foreground);
                    --user-bg: var(--vscode-input-background);
                    --assistant-bg: var(--vscode-sideBar-background);
                    --border-color: var(--vscode-editorWidget-border);
                }

                body {
                    font-family: 'Segoe UI', sans-serif;
                    margin: 0;
                    padding: 1rem;
                    background: var(--bg-color);
                    color: var(--text-color);
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }

                .chat-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    margin: 1rem 0;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .message {
                    max-width: 80%;
                    padding: 0.8rem 1.2rem;
                    border-radius: 1rem;
                    line-height: 1.4;
                    animation: fadeIn 0.3s ease-in;
                }

                .user-message {
                    background: var(--user-bg);
                    align-self: flex-end;
                }

                .assistant-message {
                    background: var(--assistant-bg);
                    border: 1px solid var(--border-color);
                    align-self: flex-start;
                }

                .input-container {
                    display: flex;
                    gap: 0.5rem;
                    padding-top: 0.5rem;
                }

                #prompt {
                    flex: 1;
                    padding: 0.8rem;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--bg-color);
                    color: var(--text-color);
                    font-family: inherit;
                }

                #askBtn {
                    padding: 0.8rem 1.5rem;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                #askBtn:hover {
                    opacity: 0.9;
                }

                #askBtn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
		</head>
		<body>
		<h2> FastCodeR1 Extension </h2>
		<div class="chat-container" id="chatContainer"></div>
		<div class="input-container">
			<textarea id="prompt" rows="3" placeholder="Ask something..."></textarea>
			<button id="askBtn">Ask</button>
		</div>
			<div id = "response"></div>

			<script>
				const vscode = acquireVsCodeApi();
                const chatContainer = document.getElementById('chatContainer');
                const promptTextarea = document.getElementById('prompt');
                const askBtn = document.getElementById('askBtn');
                let currentAssistantMessage = null;
                let shouldAutoScroll = true;
                let isScrolling = false;

                // Add scroll event listener
                chatContainer.addEventListener('scroll', () => {
                    const threshold = 50; // pixels from bottom
                    const atBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + threshold;
                    shouldAutoScroll = atBottom;
                });

                function addMessage(text, isUser = false) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = isUser ? 'message user-message' : 'message assistant-message';
                    messageDiv.textContent = text;
                    chatContainer.appendChild(messageDiv);
                    
                    // Only auto-scroll if we're near the bottom
                    if (shouldAutoScroll) {
                        requestAnimationFrame(() => {
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        });
                    }
                    return messageDiv;
                }

                askBtn.addEventListener('click', () => {
                    const text = promptTextarea.value.trim();
                    if (!text) return;

                    // Add user message and force scroll
                    addMessage(text, true);
                    promptTextarea.value = '';
                    askBtn.disabled = true;

                    // Create temporary assistant message and force scroll
                    currentAssistantMessage = addMessage('...', false);
                    shouldAutoScroll = true;
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    
                    vscode.postMessage({ command: 'chat', text: text });
                });

                window.addEventListener('message', event => {
                    const { command, text, isFinal } = event.data;
                    if (command === 'chatResponse') {
                        currentAssistantMessage.textContent = text;
                        
                        // Only scroll if we should auto-scroll
                        if (shouldAutoScroll) {
                            requestAnimationFrame(() => {
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            });
                        }
                        
                        if (isFinal) {
                            askBtn.disabled = false;
                            currentAssistantMessage = null;
                        }
                    }
                });

                // Handle Enter key for submission (Shift+Enter for new line)
                promptTextarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        askBtn.click();
                    }
                });

			</script>
		</body>
		</html>	
	`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
