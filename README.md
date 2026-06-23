# Platform Web Engine — Run-and-Gun Starter

Engine web para criar jogos de plataforma com:

- tela TV/host
- controles por celular
- multiplayer local/remoto até 4 jogadores
- viewer/play renderizando o mesmo jogo por estado
- editor drag-and-drop
- catálogo de inimigos, chefes, armas, drops e hazards
- sistema de fases customizadas

## Como rodar

```bash
npm install
npm start
```

Abra a URL da TV no navegador e conecte controles pelo QR/código.

## Entrypoints

- TV: `/`
- Controle: `/controller.html`
- Amigo/viewer: `/viewer.html`
- Editor: `/editor.html`

## Organização

```text
public/
  assets/
    css/
    js/
      engine/
      game/
      controller/
      editor/
      viewer/
      config/
    sprites/
    audio/
docs/
src/
```

## Documentação

- `docs/ARCHITECTURE.md`
- `docs/EDITOR_GUIDE.md`
- `docs/EXTENDING_ENGINE.md`
- `engine.manifest.json`

# Blaster Balls - Online/VPS + D-pad

Versão com duas mudanças principais:

1. Dá para hospedar numa VPS/VPN e jogar de casas diferentes.
2. O controle esquerdo deixou de ser analógico e virou setas/D-pad.

## Como rodar local

```bash
npm install
npm start
```

Abra:

```txt
http://SEU-IP:3000
```

## Como rodar numa VPS

Na VPS:

```bash
sudo apt update
sudo apt install nodejs npm unzip
unzip poc-platform-shooter-online-dpad.zip
cd poc-platform-shooter-online-dpad
npm install
PUBLIC_URL=https://jogo.seudominio.com npm start
```

Sem domínio:

```bash
PUBLIC_URL=http://IP-DA-VPS:3000 npm start
```

Abra a porta:

```bash
sudo ufw allow 3000/tcp
```

## Com Nginx + HTTPS

```nginx
server {
    server_name jogo.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Depois:

```bash
sudo certbot --nginx
PUBLIC_URL=https://jogo.seudominio.com npm start
```

## Controle

- Setas da esquerda:
  - esquerda/direita: mover
  - cima: pular
  - baixo: agachar
- Stick direito:
  - mirar
  - atirar automaticamente
- Botão:
  - granada

## Importante

Para jogar de casas diferentes, TV e celulares precisam acessar a mesma URL pública da VPS/VPN.

O QR Code respeita a variável `PUBLIC_URL`, então ele gera o link público correto.


## HUD arcade

A TV agora usa uma HUD mais estilo run-and-gun arcade:

- Retrato/ícone do player
- Vida grande com barra
- ARMS
- BOMB
- TIME central
- ENEMIES / BOSS / PORTAL
- SCORE com zeros
- Fase e kills

Isso deixa leitura de vida, score e objetivo mais clara durante a ação.


## Ajuste pedido

- Dificuldade não aparece durante o jogo.
- Analógico esquerdo voltou.
- Botão PULAR agora é pequeno/redondo no lado direito, acima da mira/tiro.
- GRANADA fica pequeno/redondo ao lado da mira.
- Mira/tiro continua no analógico direito.


## Correção de HUD e multiplayer remoto

- O `TIME` foi movido para uma área livre da HUD, sem ficar em cima de `BOMB`.
- A TV agora mostra também um link de convite do controle.
- Amigos em casas diferentes podem entrar na mesma sessão usando o mesmo link/código.
- Em VPS/VPN, rode com `PUBLIC_URL` para o QR/link apontar para o endereço público.

Exemplo:

```bash
PUBLIC_URL=https://jogo.seudominio.com npm start
```

Ou sem domínio:

```bash
PUBLIC_URL=http://IP-DA-VPS:3000 npm start
```

Todos que abrirem o link `/controller.html?code=XXXX` entram na mesma sessão da TV.


## Ajuste de botões

- PULAR e GRANADA agora ficam lado a lado.
- Os dois ficam acima da mira/tiro, no lado direito.


## Editor de fases drag and drop

Abra:

```txt
/editor.html
```

O editor permite:
- criar chão e plataformas
- posicionar inimigos
- posicionar hazards como fogo, ácido, laser, serra e barril
- posicionar portal
- configurar nome, largura, música e fundo da fase
- arrastar objetos
- redimensionar plataformas/hazards pelo canto inferior direito
- exportar/copiar JSON
- importar JSON
- testar a fase direto no jogo

Para testar:
1. Crie a fase no editor.
2. Clique em **Testar no jogo**.
3. O editor salva a fase no `localStorage`.
4. O jogo abre carregando a fase customizada como primeira fase.

Para usar fixo no código, copie o JSON exportado e converta para o array `levels` no `game.js`.


## Editor de fases V2

Abra:

```txt
/editor.html
```

Novidades:
- Zoom in/out com mouse wheel.
- Pan com Shift + arrastar, botão direito ou ferramenta Pan.
- Selecionar qualquer objeto.
- Apagar com botão ou tecla Delete.
- Duplicar com botão ou Ctrl+D.
- Copiar/colar com Ctrl+C/Ctrl+V.
- Prévia visual de cada componente na paleta.
- Busca de componentes.
- Muito mais componentes:
  - 6 tipos de plataforma/chão
  - 16 inimigos/chefes
  - 7 hazards
  - pickups
  - decoração/cenário
  - portal
- Exportar/importar JSON.
- Testar direto no jogo com botão **Testar no jogo**.


## Visual arcade/pixel-art

Esta versão troca o visual simples por sprites próprios desenhados via canvas:

- Herói pixel-art com capacete, visor e arma.
- Inimigos com sprites diferentes por tipo.
- Chefes maiores com visual próprio.
- Plataformas com tiles e highlight por fase.
- Fundo com parallax, skyline e iluminação.
- Tiros com trail visual.

Observação: não usa sprites ripados de jogos comerciais. São sprites próprios/procedurais para evitar problema de copyright.


## Fix HUD multiplayer

Correção:
- A faixa `PLAYERS` não fica mais em cima da linha da fase.
- Cards P1/P2/P3/P4 ficam numa faixa própria abaixo do cabeçalho.
- Score, time, arms, bomb e enemies continuam no topo.
- Visual arcade/sprites preservado.


## HUD multiplayer sem duplicar P1

Correção:
- Com 1 jogador: mantém HUD clássica `1UP`.
- Com 2+ jogadores: remove o bloco `1UP` azul do P1.
- O bloco `PLAYERS` vira a fonte única de vida/kills/status para P1/P2/P3/P4.
- Não duplica mais informação do Player 1.


## Animação de morte do player

Correção:
- Quando o player morre, toca uma animação curta.
- O personagem faz um pop/explosão e some da tela.
- A HUD continua mostrando o jogador como DOWN/0%.
- Ao reiniciar fase ou começar nova partida, o player volta normalmente.


## Customização de controle e HUD

### No celular

Abra o painel discreto **Conexão** e use:

- **Editar layout**: ativa/desativa modo de arrastar.
- **Salvar layout**: salva posições no `localStorage`.
- **Reset layout**: volta ao padrão.

Você pode mover:
- analógico esquerdo
- mira/tiro
- pular
- granada

### Na TV

Use os botões no canto inferior esquerdo:

- **Editar HUD**
- **Salvar HUD**
- **Reset HUD**

Também dá para apertar `H` no teclado para ligar/desligar edição de HUD.

Com o modo ativo, arraste os blocos:
- players
- singlePlayer / 1UP
- arms
- bomb
- time
- enemies
- score
- fase

As posições são salvas no `localStorage` do navegador.


## Correção: edição só no gameplay

- O layout do controle só pode ser editado depois que o jogo começa.
- No lobby, com dificuldade/COMEÇAR, os botões de layout ficam escondidos.
- O botão COMEÇAR e a tela de dificuldade não podem ser arrastados.
- Ao voltar para game over/lobby, o modo edição é desligado automaticamente.


## Correção do salvar layout

- Ao clicar em **Salvar layout**:
  - salva as posições
  - desliga o modo edição
  - remove o contorno de edição
  - fecha o painel **Conexão**
  - volta para o gameplay limpo


## Correção lobby/layout

- O layout customizado não é aplicado no lobby.
- Ao voltar para a tela de dificuldade/COMEÇAR, os controles voltam para o fluxo padrão.
- O botão COMEÇAR não fica mais coberto pelo analógico ou botões salvos.
- O layout salvo volta automaticamente quando o jogo começa.


## Correção persistência do layout

- O layout salvo continua limpo no lobby.
- Ao apertar COMEÇAR e entrar no gameplay, o layout salvo é reaplicado automaticamente.
- A reaplicação acontece algumas vezes após o início para sobreviver a fullscreen/orientação/reflow do celular.
- Ao salvar, o modo edição desliga e o layout permanece aplicado.


## Opção 3: TV / Play / Spectator

Agora o projeto tem rotas separadas:

- `/tv` ou `/`  
  Abre a tela principal/host do jogo. É quem roda a simulação.

- `/controller.html?code=XXXX`  
  Abre o controle no celular.

- `/play?code=XXXX`  
  Abre a mesma tela do jogo para um amigo em outro computador.

- `/spectator?code=XXXX`  
  Igual ao `/play`, para assistir.

### Como usar remoto

1. Na VPS, rode com URL pública:

```bash
PUBLIC_URL=https://jogo.seudominio.com npm start
```

ou:

```bash
PUBLIC_URL=http://IP-DA-VPS:3000 npm start
```

2. Você abre:

```txt
https://jogo.seudominio.com/tv
```

3. Seu amigo abre o link `Tela amigo` que aparece na TV, ou:

```txt
https://jogo.seudominio.com/play?code=CODIGO
```

4. Cada jogador usa o link do controle:

```txt
https://jogo.seudominio.com/controller.html?code=CODIGO
```

### Observação técnica

Esta versão mantém a TV como host da simulação e transmite frames da tela para `/play` e `/spectator` via WebSocket.  
É a forma mais rápida de permitir que amigos remotos vejam a mesma partida sem reescrever o motor inteiro para servidor autoritativo.


## Ajuste URLs e HUD pelo controle

- O card da TV com QR/código/links ficou maior.
- URLs de Controle e Tela amigo agora aparecem completas, quebrando linha quando necessário.
- URLs viraram links clicáveis.
- Removidos os botões Editar HUD / Salvar HUD / Reset HUD da tela da TV.
- A edição de HUD agora fica no controle, dentro do painel Conexão, apenas durante o gameplay.


## Bugfix join/game over

- Corrigido travamento quando entra o segundo jogador.
- O erro era uma chamada de HUD multiplayer usando variáveis fora do escopo.
- Novo jogador pode entrar com a partida em andamento sem quebrar a tela.
- Corrigido controle no game over/lobby: layout customizado não reaplica em cima do botão COMEÇAR.


## Otimização de delay remoto

O modo `/play` e `/spectator` foi otimizado para baixa latência:

- Stream reduzido para 640x360.
- JPEG com compressão maior.
- FPS remoto limitado a 10fps.
- Frames antigos são descartados quando a conexão atrasa.
- O servidor não envia frame para cliente com WebSocket congestionado.
- O viewer só renderiza o frame mais recente, sem criar fila.

Isso reduz muito o delay. A imagem remota fica mais leve, mas a jogabilidade fica muito mais viável.


## Remote state sync sem streaming

O `/play` e `/spectator` não usam mais streaming de imagem.

Agora funciona assim:

- TV/host roda a simulação.
- TV envia estado JSON leve via WebSocket.
- `/play` renderiza localmente em canvas próprio.
- O viewer mantém só o estado mais recente.
- Sem base64/JPEG acumulando fila.

Isso reduz muito o delay comparado ao modo anterior.


## Visual bonito também no /play

O `/play` e `/spectator` agora renderizam com sprites próprios, não mais bolinhas/quadrados simples:

- player pixel-art
- inimigos com variações visuais
- chefes maiores
- tiros com trail
- granada desenhada melhor
- pickups com ícones
- decoração/cenário mais parecido com o host

Continua usando state sync JSON, sem streaming de imagem.


## Paridade visual host/play

A tela `/play` e `/spectator` foi ajustada para ficar mais parecida com o host:

- plataformas com tiles e highlight igual ao host
- cenário com janelas/luzes no parallax
- hazards desenhados com mais detalhes
- portal com pulso/anel
- partículas mais parecidas
- decoração mais próxima da TV

Continua usando state sync JSON, sem streaming de imagem.


## Renderer compartilhado

Agora a TV/host e o `/play`/`spectator` usam o mesmo arquivo:

```txt
/public/shared-renderer.js
```

A TV não usa mais um desenho diferente do remoto. O host serializa o state JSON e tanto a TV quanto o `/play` chamam:

```js
SharedBlasterRenderer.draw(ctx, state)
```

Isso garante que cenário, HUD, players, inimigos, tiros, hazards, portal e partículas renderizem iguais em qualquer tela.


## Hotfix travamento

A tentativa anterior colocou a TV usando o renderer compartilhado e isso travou o host em alguns fluxos.

Hotfix:
- TV/host voltou para o render original estável.
- `/play` e `/spectator` continuam usando state sync.
- Removido o ponto que travava o jogo.


## Visual idêntico TV e /play

Correção:
- TV e `/play` chamam o mesmo renderer: `BlasterSharedRenderer.draw(...)`.
- A simulação da TV continua original; só o desenho foi unificado.
- `/play` recebe state JSON e desenha com o mesmo código da TV.
- Isso elimina divergência visual entre host e remoto.


## Card QR/links corrigido

- Painel do QR reorganizado com layout em grid.
- QR maior e sem espremer.
- Código destacado.
- Links em caixas próprias, com quebra real de linha.
- URLs não cortam mais com ellipsis/nowrap.
- Editor de fases virou botão separado no card.


## Card centralizado compacto

- Card QR centralizado no topo.
- QR menor e legível, sem espremer.
- Código, status e links organizados.
- Links ficam em uma linha com ellipsis para não quebrar o layout.
- Ao passar o mouse, o link pode quebrar linha para leitura completa.
- Header menor para preservar área jogável.


## Card compacto no topo

- Card QR subiu e ficou mais baixo.
- QR reduzido para não cobrir HUD.
- Links ficam compactos lado a lado.
- Canvas ganhou mais altura jogável.
- Texto do lobby foi reduzido.


## Card QR no topo absoluto

- Card agora fica colado no topo do header.
- Altura reduzida para 70px.
- QR reduzido para 58px.
- Canvas começa abaixo do header para não cobrir HUD.


## Fix andar + pular

- Corrigido pulo enquanto o jogador está andando.
- Controle agora envia `jumpSeq`, um evento de pulo independente do botão.
- Adicionado buffer curto de pulo para multi-touch.
- CSS força `touch-action:none` nos controles.
- Game usa coyote time curto para não perder pulo por timing.


## Fix identidade, câmera e pulo

- Cada controle agora tem `clientId` persistido no `localStorage`.
- Recarregar a página mantém o mesmo player/cor.
- Reconectar substitui o socket antigo em vez de criar boneco infinito.
- Sala limitada de verdade a 4 slots.
- Câmera passou a considerar o grupo, não só quem foi mais para frente.
- Player atrasado não morre por ficar fora da tela; é mantido na borda visível.
- Pulo recebeu `jumpSeq`, buffer e coyote time para funcionar andando + pulando.


## Fix bomba/granada

- Botão bomba agora usa `grenadeSeq`, igual ao `jumpSeq`.
- Toque rápido não é mais perdido.
- Funciona junto com andar/mirar/pular.
- Adicionados `pointercancel` e `lostpointercapture`.
- Game consome o evento de granada por sequência, não só por botão pressionado.


## Fix viewer responsivo

- `/play` e `/spectator` agora mantêm proporção 16:9 sem cortar.
- Canvas encaixa pela menor dimensão disponível.
- Rodapé some automaticamente em telas baixas.
- Header ficou mais compacto.
- Adicionado botão de tela cheia no viewer.


## Fix pontos/kills

- Indicador de pontos/kills centralizado no topo.
- Separado do card QR para não sobrepor.
- Estilo com fundo escuro para melhor leitura.


## Hotfix controle

- Ajustes visuais da TV/play foram isolados para não quebrar o `/controller`.
- Layout do controle restaurado:
  - header normal
  - analógico esquerdo
  - mira à direita
  - botões pular/bomba
  - multi-touch preservado


## Fix editor de layout: bomba sumindo

- Durante edição de layout, tocar na bomba não dispara mais a ação.
- O botão mantém largura/altura ao virar `position: fixed`.
- Arraste fica limitado dentro da tela.
- Bomba/pular ficam com z-index alto e visíveis durante edição.


## Pontos/Kills à esquerda

- Pontos/Kills movido para o lado esquerdo, perto do subtítulo.
- Não sobrepõe mais o card QR.


## Fix editor de layout: bomba não some

- O editor agora move o grupo de ações (`Pular + Bomba`) junto.
- A bomba e o pular não viram `position: fixed` individualmente.
- Layout antigo salvo de `grenade`/`jump` é migrado para `actions`.
- Clicar na bomba durante edição não dispara a bomba; apenas arrasta o grupo.


## Editor de layout individual

- Todos os elementos voltaram a ser editáveis individualmente:
  - Mover
  - Mira
  - Pular
  - Bomba
- Corrigido bug da bomba sumir mantendo tamanho/visibilidade quando vira `fixed`.
- Layout salvo antigo de grupo `actions` é migrado para `jump` e `grenade`.


## Pausa no menu Conexão

- Ao abrir **Conexão** no controle, a TV pausa o jogo.
- Ao fechar **Conexão**, o jogo continua.
- Removidos os botões inúteis de HUD:
  - Editar HUD
  - Salvar HUD
  - Reset HUD


## Sistema de vidas e revive

- Cada player começa com 3 vidas ao iniciar uma partida.
- Quando morre e ainda tem vida, perde 1 vida e respawna na mesma fase.
- Quando fica sem vidas, permanece caído até alguém pegar item de revive.
- Inimigos podem dropar:
  - `heal`: recupera sangue
  - `life`: +1 vida
  - `revive`: revive um player sem vidas
  - `rapid`: bônus existente
- Chefes sempre dropam vida e heal/revive.


## HUD de vidas

- HUD agora mostra vidas separadas do HP:
  - `❤️ x2   87%`
  - `❤️ x1 ⏳` durante respawn
  - `❤️ x0 ☠` aguardando revive
- Aplicado na TV e no `/play`/`spectator`.


## Fix HUD de vidas single player

- Quando existe só 1 player, o HUD agora também mostra:
  - `❤️ x3   100%`
- Aplicado na TV e no `/play`.


## Respawn com HP cheio

- Player agora volta do respawn com 100% HP.
- Mantida invencibilidade temporária no respawn.


## Sistema de armas

- Arma default ficou mais fraca e mais lenta.
- Adicionado catálogo com 30 armas especiais.
- Armas dropam aleatoriamente de inimigos.
- Cada fase garante 1 ou 2 drops de armas.
- Armas especiais têm munição limitada.
- Quando a munição acaba, o player volta para a Pistola default.
- HUD mostra arma atual e balas restantes.


## Ícones de drops melhorados

- HP agora aparece como medkit/cruz verde.
- Vida extra aparece como coração.
- Revive aparece como círculo roxo com cruz/seta.
- Armas aparecem com formatos diferentes conforme o tipo.
- Ícones aplicados na TV e no `/play`/`spectator`.


## Hotfix bombas limitadas

- Refeito em cima da versão estável anterior.
- Cada player começa/respawna com 5 bombas.
- Usar bomba consome 1.
- Inimigos podem dropar pacote de bombas.
- Chefes dropam pacote grande.
- HUD mostra `💣 xN`.


## Hotfix crash drawDropIcon

- `drawDropIcon` agora ignora item inválido.
- Pickups sem `x/y/w/h` recebem valores padrão.
- Serialização de pickups foi blindada.
- Aplicado na TV e no `/play`.


## Mais inimigos e chefões

- Adicionados 20 tipos novos de inimigos:
  bruiser, leaper, charger, medic, summoner, splitter, bat, skull, minebot,
  flametrooper, cryotrooper, shocker, teleport, spider, turretbot, grenadier,
  poisoner, phantom, samurai e mimic.
- Adicionados chefões novos:
  boss_dragon, boss_spider, boss_warlock, boss_train e boss_queen.
- Novos comportamentos:
  cura de aliados, invocação, teleporte, saltos, investida, tiros em leque,
  ácido, foguete, bombas e chefes que invocam inimigos.
- Fases receberam inimigos novos distribuídos.


## Armadilhas eletrizantes

Novos hazards adicionados:
- `blade_wall`: parede de lâminas móvel
- `spikes`: espinhos temporizados
- `laser_sweep`: laser móvel vertical/horizontal
- `pendulum`: bola/lâmina pendular
- `mine`: mina explosiva
- `beast`, `raptor`, `snake`, `bat_swarm`: animais/feras do cenário

As fases receberam armadilhas novas distribuídas para aumentar tensão e variedade.


## Cor do jogador e friendly-fire

- Inimigos/hazards não causam dano em outros inimigos por explosão.
- Apenas explosões/disparos dos players ferem inimigos.
- Controle agora permite escolher entre 4 cores:
  - Azul
  - Rosa
  - Amarelo
  - Verde
- Cor ocupada por outro jogador fica bloqueada.
- A escolha fica salva no aparelho.


## Polimento geral

- Subtítulo simplificado para `Run-and-gun eletrizante`.
- HUD de armas usa nomes curtos para caber melhor no quadradinho.
- Sons de inimigos/hit ficaram menos chiados e mais suaves.
- Player ganhou animação mais fluida:
  - corrida com pernas animadas
  - bob/squash no pulo
  - recoil e flash da arma
- IA dos inimigos melhorada:
  - detecta quando ficou preso
  - pula obstáculos
  - evita cair de plataformas
  - reposiciona quando fica travado
  - tenta subir/descer conforme posição do player


## Fix inimigo grudando no player

- Ao encostar no player, o inimigo agora é separado/empurrado para trás.
- Contato aplica dano com cooldown curto, sem ficar travado em cima do personagem.
- Player também recebe pequeno knockback.
- IA limpa o estado de preso após contato.


## Editor atualizado

O editor agora inclui os componentes atuais do jogo:

- Todos os inimigos novos
- Todos os chefões novos
- Armadilhas novas:
  - lâminas
  - espinhos
  - laser móvel
  - pêndulo
  - mina
  - animais/feras
- Drops:
  - HP/sangue
  - vida
  - revive
  - bombas +2/+5/+10
  - tiro rápido
- 30 armas dropáveis com munição configurada
- Mais plataformas e decorações

Também foram adicionados previews melhores para pickups, armas e hazards novos.


## Fix forte: inimigo grudado no player

- Inimigo agora entra em estado de repulsão ao encostar.
- Separação horizontal mais forte no mesmo frame.
- Inimigo não volta imediatamente para cima do player.
- Se ainda estiver colidindo, recebe segundo empurrão de segurança.


## Dano especial por contato

- Alguns inimigos agora causam muito mais dano ao encostar.
- Ninja e samurai podem aplicar golpe crítico fatal raro.
- Chefões causam dano pesado de contato.
- Repulsão continua existindo para não bugar grudado, mas assassinos não são empurrados tão longe.


## Low-latency mode

Esta versão foi refinada para controle praticamente instantâneo:

- input do controle em ~60Hz
- envio imediato quando mexe/atira/pula
- WebSocket sem compressão para mensagens pequenas
- stream de estado em ~60Hz
- descarte de frames antigos quando a rede atrasa
- menos serialização duplicada por frame
- `touch-action:none` nos controles

Veja `docs/LATENCY.md`.
