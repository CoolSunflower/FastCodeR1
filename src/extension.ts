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

		panel.webview.onDidReceiveMessage(async(message: any) => {
			if(message.command === 'chat'){
				const userPrompt = message.text;
				let responseText = '';

				try{
					const streamResponse = await ollama.chat({
						model: 'deepseek-r1:1.5b',
						messages: [{role: 'user', content: userPrompt}],
						stream: true
					});

					for await(const part of streamResponse){
						responseText += part.message.content;
						panel.webview.postMessage({command: 'chatResponse', text: responseText});
					}
				}catch(err){
					panel.webview.postMessage({command: 'chatResponse', test: `Error: ${String(err)}`});
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
			<style>
				body {font-family: sand-serif; margin: 1rem;}
				#prompt {width: 100%; box-sizing: border-box;}
				#respone {border: 1px solid #ccc; margin-top: 1rem; padding: 0; width: 100%; min-height: 50%; box-sizing: border-box;}
			</style>
		</head>
		<body>
			<h2> FastCodeR1 Extension </h2>
			<textarea id = "prompt" rows = "3" placeholder = "Ask Something..."></textarea><br />
			<button id = "askBtn"> Ask </button>
			<div id = "response"></div>

			<script>
				const vscode = acquireVsCodeApi();

				document.getElementById('askBtn').addEventListener('click', () => {
					const text = document.getElementById('prompt').value;
					vscode.postMessage({command: 'chat', text: text});
				});

				window.addEventListener('message', event => {
					const { command, text } = event.data;
					if(command === 'chatResponse'){
						document.getElementById('response').innerText = text;
					}
				});
			</script>
		</body>
		</html>	
	`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
