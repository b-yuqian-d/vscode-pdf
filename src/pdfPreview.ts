import * as path from 'path';
import * as vscode from 'vscode';
import { Disposable } from './disposable';
import {Buffer} from "node:buffer";
import debounce from 'lodash.debounce'

type PreviewState = 'Disposed' | 'Visible' | 'Active';

export class PdfPreview extends Disposable {
  private _previewState: PreviewState = 'Visible';

  constructor(
    private readonly extensionRoot: vscode.Uri,
    private readonly documentUri: vscode.Uri,
    private readonly webviewPanel: vscode.WebviewPanel
  ) {
    super();
    const resourceRoot = documentUri.with({
      path: documentUri.path.replace(/\/[^/]+?\.\w+$/, '/'),
    });

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [resourceRoot, extensionRoot],
    };

    this._register(
      webviewPanel.webview.onDidReceiveMessage((message) => {
        switch (message.type) {
          case 'reopen-as-text': {
            vscode.commands.executeCommand(
              'vscode.openWith',
              documentUri,
              'default',
              webviewPanel.viewColumn
            );
            break;
          }
        }
      })
    );

    this._register(
      webviewPanel.onDidChangeViewState(() => {
        this.update();
      })
    );

    this._register(
      webviewPanel.onDidDispose(() => {
        this._previewState = 'Disposed';
      })
    );

    const watcher = this._register(
      vscode.workspace.createFileSystemWatcher(documentUri.fsPath)
    );

    const reloadDocument = debounce(async () => {
      await this.reload();
    }, 500);

    this._register(
      watcher.onDidChange(async (e) => {
        if (e.toString() === this.documentUri.toString()) {
          await reloadDocument();
        }
      })
    );
    this._register(
      watcher.onDidDelete((e) => {
        if (e.toString() === this.documentUri.toString()) {
          this.webviewPanel.dispose();
        }
      })
    );
  }

  public async load(): Promise<void> {
    this.webviewPanel.webview.html = await this.getWebviewContent();
    this.update();
  }

  private async reload(): Promise<void> {
    if (this._previewState !== 'Disposed') {
      await this.webviewPanel.webview.postMessage({ type: 'reload' });
    }
  }

  private update(): void {
    if (this._previewState === 'Disposed') {
      return;
    }

    if (this.webviewPanel.active) {
      this._previewState = 'Active';
      return;
    }
    this._previewState = 'Visible';
  }

  private getConfig(): string {
    const workspaceConfig = vscode.workspace.getConfiguration('pdfPreview');
    const document = this.webviewPanel.webview.asWebviewUri(this.documentUri);
    const pdfViewerConfig = {
      cursor: workspaceConfig.get("cursor"),
      scale: workspaceConfig.get("scale"),
      sidebar: workspaceConfig.get("sidebar"),
      scrollMode: workspaceConfig.get("scrollMode"),
      spreadMode: workspaceConfig.get("spreadMode"),
      documentUrl: document.toString(),
    }
    const buffer = Buffer.from(JSON.stringify(pdfViewerConfig));
    return buffer.toString('base64url');
  }

  private async getWebviewContent(): Promise<string> {
    const webview = this.webviewPanel.webview;
    const cspSource = webview.cspSource;
    const config = this.getConfig();

    const pdfjsViewerPath = path.join(this.extensionRoot.path, "webview/lib/web/")
    const webviewResourceBaseUri = webview.asWebviewUri(vscode.Uri.file(pdfjsViewerPath));
    const viewerHtmlUri = vscode.Uri.file(path.join(pdfjsViewerPath, 'viewer.html'));
    const pdfjsViewerContent = await vscode.workspace.fs.readFile(viewerHtmlUri);
    const rawHtml = (new TextDecoder).decode(pdfjsViewerContent);
    return rawHtml.replace("#WEBVIEW_RESOURCE_BASE_URL#", webviewResourceBaseUri.toString())
      .replaceAll("#CONTENT_SECURITY_POLICY#", cspSource)
      .replace("#PDF_VIEWER_CONFIG#", config);
  }
}
