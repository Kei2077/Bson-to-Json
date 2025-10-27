
document.addEventListener('DOMContentLoaded', function() {
    const areaSoltar = document.getElementById('areaSoltar');
    const entradaArquivo = document.getElementById('entradaArquivo');
    const botaoNavegar = document.getElementById('botaoNavegar');
    const infoArquivo = document.getElementById('infoArquivo');
    const botaoConverter = document.getElementById('botaoConverter');
    const areaResultado = document.getElementById('areaResultado');
    const exibicaoJson = document.getElementById('exibicaoJson');
    const botaoDownload = document.getElementById('botaoDownload');
    const carregando = document.getElementById('carregando');
    const mensagemInfo = document.getElementById('mensagemInfo');
    const mensagemSucesso = document.getElementById('mensagemSucesso');
    const mensagemAviso = document.getElementById('mensagemAviso');
    
    let arquivoSelecionado = null;
    
    // Eventos para a área de soltar
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(nomeEvento => {
        areaSoltar.addEventListener(nomeEvento, prevenirPadroes, false);
    });
    
    function prevenirPadroes(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(nomeEvento => {
        areaSoltar.addEventListener(nomeEvento, destacar, false);
    });
    
    ['dragleave', 'drop'].forEach(nomeEvento => {
        areaSoltar.addEventListener(nomeEvento, removerDestaque, false);
    });
    
    function destacar() {
        areaSoltar.classList.add('destaque');
    }
    
    function removerDestaque() {
        areaSoltar.classList.remove('destaque');
    }
    
    areaSoltar.addEventListener('drop', lidarComSoltar, false);
    
    function lidarComSoltar(e) {
        const dt = e.dataTransfer;
        const arquivos = dt.files;
        lidarComArquivos(arquivos);
    }
    
    botaoNavegar.addEventListener('click', () => {
        entradaArquivo.click();
    });
    
    entradaArquivo.addEventListener('change', function() {
        lidarComArquivos(this.files);
    });
    
    function lidarComArquivos(arquivos) {
        if (arquivos.length === 0) return;
        
        const arquivo = arquivos[0];
        arquivoSelecionado = arquivo;
        
        infoArquivo.innerHTML = `
            <strong>Arquivo selecionado:</strong> ${arquivo.name}<br>
            <strong>Tamanho:</strong> ${formatarTamanhoArquivo(arquivo.size)}<br>
            <strong>Tipo:</strong> ${arquivo.type || 'Desconhecido'}
        `;
        
        botaoConverter.style.display = 'inline-block';
        areaResultado.style.display = 'none';
        ocultarTodasMensagens();
        
        mostrarInfo(`Arquivo "${arquivo.name}" selecionado. Clique em "Tentar Converter para JSON" para processar.`);
    }
    
    botaoConverter.addEventListener('click', tentarConverterParaJSON);
    
    function tentarConverterParaJSON() {
        if (!arquivoSelecionado) {
            mostrarAviso('Nenhum arquivo selecionado');
            return;
        }
        
        carregando.style.display = 'block';
        botaoConverter.disabled = true;
        ocultarTodasMensagens();
        
        const leitor = new FileReader();
        
        leitor.onload = function(e) {
            try {
                // Tentar converter o arquivo para JSON
                const buffer = e.target.result;
                
                // Verificar se o arquivo está vazio
                if (buffer.byteLength === 0) {
                    mostrarAviso('O arquivo selecionado está vazio');
                    exibirJSONVazio();
                    return;
                }
                
                // Tentar desserializar como BSON
                try {
                    const dadosBSON = BSON.deserialize(new Uint8Array(buffer));
                    const stringJSON = JSON.stringify(dadosBSON, null, 2);
                    
                    // Exibir o resultado
                    exibicaoJson.textContent = stringJSON;
                    areaResultado.style.display = 'block';
                    
                    // Configurar o botão de download
                    botaoDownload.onclick = function() {
                        baixarJSON(stringJSON, arquivoSelecionado.name.replace(/\.[^/.]+$/, "") + '.json');
                    };
                    
                    mostrarSucesso('Arquivo BSON convertido com sucesso para JSON!');
                } catch (erroBSON) {
                    // Se não for BSON válido, tentar como texto
                    try {
                        const texto = new TextDecoder().decode(new Uint8Array(buffer));
                        // Verificar se é JSON válido
                        JSON.parse(texto);
                        exibicaoJson.textContent = texto;
                        areaResultado.style.display = 'block';
                        
                        botaoDownload.onclick = function() {
                            baixarJSON(texto, arquivoSelecionado.name.replace(/\.[^/.]+$/, "") + '_convertido.json');
                        };
                        
                        mostrarInfo('O arquivo já está em formato JSON. Exibindo conteúdo.');
                    } catch (erroJSON) {
                        // Se não for JSON válido, criar um objeto com informações do arquivo
                        const objetoInfoArquivo = {
                            nomeArquivo: arquivoSelecionado.name,
                            tamanhoArquivo: arquivoSelecionado.size,
                            tipoArquivo: arquivoSelecionado.type || 'Desconhecido',
                            mensagem: 'Este arquivo não é um BSON válido nem um JSON válido. Não foi possível converter para JSON.',
                            previsualizacaoDadosBrutos: Array.from(new Uint8Array(buffer.slice(0, 100))).map(b => b.toString(16).padStart(2, '0')).join(' ')
                        };
                        
                        const stringJSON = JSON.stringify(objetoInfoArquivo, null, 2);
                        exibicaoJson.textContent = stringJSON;
                        areaResultado.style.display = 'block';
                        
                        botaoDownload.onclick = function() {
                            baixarJSON(stringJSON, arquivoSelecionado.name.replace(/\.[^/.]+$/, "") + '_info.json');
                        };
                        
                        mostrarAviso('Arquivo não é BSON válido. Exibindo informações do arquivo.');
                    }
                }
            } catch (erro) {
                // Em caso de erro inesperado
                const objetoErro = {
                    erro: 'Erro ao processar o arquivo',
                    mensagem: erro.message,
                    nomeArquivo: arquivoSelecionado.name
                };
                
                const stringJSON = JSON.stringify(objetoErro, null, 2);
                exibicaoJson.textContent = stringJSON;
                areaResultado.style.display = 'block';
                
                botaoDownload.onclick = function() {
                    baixarJSON(stringJSON, arquivoSelecionado.name.replace(/\.[^/.]+$/, "") + '_erro.json');
                };
                
                mostrarAviso('Ocorreu um erro ao processar o arquivo. Exibindo informações do erro.');
            } finally {
                carregando.style.display = 'none';
                botaoConverter.disabled = false;
            }
        };
        
        leitor.onerror = function() {
            mostrarAviso('Erro ao ler o arquivo');
            carregando.style.display = 'none';
            botaoConverter.disabled = false;
        };
        
        // Ler o arquivo como ArrayBuffer
        leitor.readAsArrayBuffer(arquivoSelecionado);
    }
    
    function exibirJSONVazio() {
        const objetoVazio = {
            mensagem: 'O arquivo selecionado está vazio (0 bytes)',
            nomeArquivo: arquivoSelecionado.name
        };
        
        const stringJSON = JSON.stringify(objetoVazio, null, 2);
        exibicaoJson.textContent = stringJSON;
        areaResultado.style.display = 'block';
        
        botaoDownload.onclick = function() {
            baixarJSON(stringJSON, arquivoSelecionado.name.replace(/\.[^/.]+$/, "") + '_vazio.json');
        };
        
        carregando.style.display = 'none';
        botaoConverter.disabled = false;
    }
    
    function baixarJSON(stringJSON, nomeArquivo) {
        const blob = new Blob([stringJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function formatarTamanhoArquivo(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const tamanhos = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamanhos[i];
    }
    
    function mostrarInfo(mensagem) {
        mensagemInfo.textContent = mensagem;
        mensagemInfo.style.display = 'block';
    }
    
    function mostrarSucesso(mensagem) {
        mensagemSucesso.textContent = mensagem;
        mensagemSucesso.style.display = 'block';
    }
    
    function mostrarAviso(mensagem) {
        mensagemAviso.textContent = mensagem;
        mensagemAviso.style.display = 'block';
    }
    
    function ocultarTodasMensagens() {
        mensagemInfo.style.display = 'none';
        mensagemSucesso.style.display = 'none';
        mensagemAviso.style.display = 'none';
    }
});
