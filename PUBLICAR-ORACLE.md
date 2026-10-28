# Publicar o site RS TECH na Oracle Cloud usando o GitHub

Este projeto usa Node.js e grava contas, solicitações, produtos, relatórios e fotos em arquivos. GitHub guarda o código; a máquina virtual Oracle executa o site. Não use GitHub Pages para este projeto: Pages publica sites estáticos e não executa o servidor Node.

## 1. Criar o repositório privado no GitHub

1. Instale e abra o [GitHub Desktop](https://desktop.github.com/).
2. Crie um repositório local usando esta pasta `outputs` como pasta do projeto.
3. Confira que o repositório está marcado como **Private** antes de publicar.
4. Faça o primeiro commit e publique o repositório na sua conta GitHub.
5. Confira a lista de arquivos do commit: `data/` e `uploads/` devem estar ignoradas. Nunca force o envio dessas pastas ao GitHub; elas contêm dados do site e arquivos enviados.

O arquivo `.gitignore` já está configurado para excluir dados, uploads, segredos e cópias de segurança. O `package.json` já informa ao serviço que o site inicia com `npm start` e precisa do Node.js 20 ou superior.

## 2. Criar a máquina virtual Oracle pelo navegador

1. Acesse o [Oracle Cloud Console](https://cloud.oracle.com/) e crie uma conta Free Tier.
2. No Console, crie uma máquina virtual Linux Ubuntu marcada como **Always Free Eligible** na região principal da conta. A disponibilidade de máquinas gratuitas pode variar por região.
3. Durante a criação, gere e baixe uma chave SSH. Guarde a chave privada em local seguro; não a envie ao GitHub nem a compartilhe.
4. Permita o tráfego de entrada nas portas 22 (SSH), 80 (HTTP) e 443 (HTTPS) nas regras de rede da instância.
5. Anote o endereço IP público da máquina.

O painel da Oracle é acessado no navegador. Para instalar e administrar o site, use o Cloud Shell no navegador ou conecte-se à máquina por SSH no Windows Terminal/PowerShell.

## 3. Preparar o HTTPS

O login do site usa cookies seguros em produção, então o endereço público deve usar HTTPS. Configure um domínio ou subdomínio gratuito apontando para o IP da máquina e emita um certificado TLS, por exemplo com Certbot/Let's Encrypt. No arquivo `deploy/nginx-rstech.conf.example`, troque `SEU_SUBDOMINIO_OU_DOMINIO` pelo endereço escolhido; depois configure o Nginx e o certificado HTTPS.

## 4. Instalar e iniciar o site

Na máquina Oracle, instale Git, Node.js 20+, Nginx e Certbot. Crie estas pastas:

```bash
sudo mkdir -p /opt/rstech/app /opt/rstech/persist/data /etc/rstech
sudo chown -R ubuntu:ubuntu /opt/rstech
```

Autorize o acesso de leitura do servidor Oracle ao repositório privado do GitHub por uma chave SSH de implantação (Deploy Key). Depois clone o repositório para `/opt/rstech/app`. Como o repositório é a pasta `outputs`, `server.mjs` e `package.json` devem ficar diretamente em `/opt/rstech/app`.

Crie `/etc/rstech/secrets.env` no servidor, sem colocá-lo no GitHub:

```text
OWNER_EMAIL=rstechassistenciacelular@gmail.com
OWNER_PASSWORD=USE_UMA_SENHA_FORTE_DE_PELO_MENOS_8_CARACTERES
```

Proteja esse arquivo e instale a unidade de serviço:

```bash
sudo chmod 600 /etc/rstech/secrets.env
sudo cp /opt/rstech/app/deploy/rstech.service.example /etc/systemd/system/rstech.service
sudo systemctl daemon-reload
sudo systemctl enable --now rstech
```

Se você transferir a pasta local `data/` para `/opt/rstech/persist/data` antes da primeira inicialização, o sistema mantém os cadastros existentes, inclusive a conta proprietária e as configurações do site. Se iniciar com a pasta vazia, o servidor cria a conta proprietária usando `OWNER_EMAIL` e `OWNER_PASSWORD`; escolha uma senha nova e forte. Não cole a senha neste documento, no GitHub ou em comandos salvos.

Para manter fotos e vídeos já enviados, copie também a pasta local `uploads/` para `/opt/rstech/app/uploads` usando uma conexão SSH segura. A pasta fica fora do repositório e permanece no disco da máquina entre atualizações.

## 5. Atualizar depois

Faça mudanças no projeto, revise o que será enviado e publique um commit no GitHub. Na máquina Oracle, atualize o código e reinicie o serviço:

```bash
cd /opt/rstech/app
git pull
sudo systemctl restart rstech
```

Não apague nem substitua `/opt/rstech/persist/data` ou `/opt/rstech/app/uploads` ao atualizar o código. Faça cópias de segurança dessas pastas em outro local seguro. O GitHub não é backup dos dados privados.

## Observação sobre os dados locais

O repositório novo não inclui `data/` ou `uploads/`, por segurança. Antes de colocar o site no ar, transfira essas pastas do computador para os caminhos indicados no servidor por SFTP/SSH. Assim, avaliações, configurações, relatórios, fotos, pedidos, produtos e contas continuam disponíveis sem expor esses arquivos no GitHub.
