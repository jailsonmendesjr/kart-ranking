# Usa uma imagem leve do Node.js (versão 18)
FROM node:18-alpine

# Cria a pasta de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências primeiro (para aproveitar o cache do Docker)
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install --production

# Copia todo o restante do código para dentro do container
COPY . .

# Expõe a porta 3000 (que é a usada no seu server.js)
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]