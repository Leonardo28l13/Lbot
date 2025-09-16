#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem Cor

echo -e "${GREEN}Iniciando o processo de atualização do LBOT...${NC}"

# URL da API do GitHub para o repositório
API_URL="https://api.github.com/repos/leonardo28l13/lbot-whatsapp/releases/latest"

# 1. Obter a URL de download do ZIP da última release
echo -e "${YELLOW}Buscando a versão mais recente...${NC}"
DOWNLOAD_URL=$(curl -s $API_URL | jq -r ".assets[0].browser_download_url")

# Verifica se a URL de download foi encontrada
if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" == "null" ]; then
    echo -e "${RED}ERRO: Não foi possível encontrar a URL de download da última versão.${NC}"
    echo -e "${RED}Verifique sua conexão com a internet ou o status do repositório no GitHub.${NC}"
    exit 1
fi

echo -e "URL de download encontrada: ${GREEN}$DOWNLOAD_URL${NC}"

# 2. Baixar o arquivo .zip
echo -e "${YELLOW}Baixando a atualização... (pode demorar alguns segundos)${NC}"
curl -L -o update.zip "$DOWNLOAD_URL"

# Verifica se o download foi bem-sucedido
if [ $? -ne 0 ]; then
    echo -e "${RED}ERRO: Falha ao baixar o arquivo de atualização.${NC}"
    exit 1
fi

echo -e "${GREEN}Download concluído.${NC}"

# 3. Extrair o conteúdo do ZIP, sobrescrevendo os arquivos existentes
echo -e "${YELLOW}Extraindo arquivos e atualizando a base do bot...${NC}"
unzip -o update.zip -d .

# Verifica se a extração foi bem-sucedida
if [ $? -ne 0 ]; then
    echo -e "${RED}ERRO: Falha ao extrair os arquivos de atualização.${NC}"
    rm update.zip # Remove o zip mesmo em caso de erro
    exit 1
fi

# 4. Limpar o arquivo .zip baixado
echo -e "${YELLOW}Limpando arquivos temporários...${NC}"
rm update.zip

echo -e "\n${GREEN}##############################################${NC}"
echo -e "${GREEN}#                                            #${NC}"
echo -e "${GREEN}#     ATUALIZAÇÃO CONCLUÍDA COM SUCESSO!     #${NC}"
echo -e "${GREEN}#                                            #${NC}"
echo -e "${GREEN}##############################################${NC}"

echo -e "\n${YELLOW}PASSOS IMPORTANTES PÓS-ATUALIZAÇÃO:${NC}"
echo -e "1. Execute ${GREEN}'npm install'${NC} para instalar qualquer nova dependência."
echo -e "2. Execute ${GREEN}'npm run build'${NC} para compilar o novo código."
echo -e "3. Inicie o bot novamente."

