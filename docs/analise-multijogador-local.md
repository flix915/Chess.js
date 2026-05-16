# Análise: Recurso de Multijogador Local (Pass-and-Play)

> Documento de análise — **nenhuma alteração de código foi feita**.
> Projeto analisado: `Chess.js/` (Enxadrista).
> Data: 2026-05-16.

## 1. Visão geral do projeto

**Stack:**
- React 19 + Vite 8, roteamento via `react-router-dom` 7
- `chess.js` — toda a lógica/regras de xadrez
- `stockfish.js` — IA adversária rodando como Web Worker (WASM)
- Supabase — autenticação (`authService.js`) e persistência (`dbService.js`)

**Arquitetura atual:**
- `src/App.jsx` — shell, header, rotas `/`, `/game`, `/auth`
- `src/pages/Game.jsx` — página fina que só renderiza `<Board />`
- `src/components/Board.jsx` — **componente monolítico (~435 linhas)** que concentra:
  estado do jogo, IA, timer, placar, histórico, tela de setup e renderização do tabuleiro.

O jogo hoje é exclusivamente **Humano (brancas) × IA (pretas)**.

## 2. O que significa "multijogador local"

Trata-se de **pass-and-play / hot-seat**: dois humanos na **mesma tela e mesmo
dispositivo**, alternando turnos. **Não exige rede, Supabase nem WebSockets** — é
puramente local. (Multiplayer *online* seria um projeto bem maior e separado.)

## 3. Onde o código atual impede o modo local

O `Board.jsx` está fortemente acoplado ao modo IA. Os bloqueios específicos:

| Local | Problema |
|---|---|
| `Board.jsx:229` | `handleSquareClick` faz `return` quando `game.turn() === 'b'` — **impede o jogador 2 (pretas) de mover** |
| `Board.jsx:257` | Após mover, chama `makeAIMove()` — a IA responderia automaticamente |
| `Board.jsx:109-154` | `useEffect` inicializa o worker do Stockfish — desnecessário no modo local |
| `Board.jsx:90-107` | `awardResultIfFinished` assume que o humano é sempre brancas (`playerWon = position.turn() === 'b'`) |
| `Board.jsx:316-346` | Tela de setup é fixa "Configurar Partida vs IA", com slider de rating da IA |
| `Board.jsx:380-396` | Placar rotulado "Capturas Jogador" / "Capturas IA" |
| `Board.jsx:202-226` / `406-409` | Status e timer dizem "Seu tempo" / "Tempo da IA" |

**Pontos que já funcionam para dois humanos sem mudança:**
- O timer já é por cor (`whiteTime` / `blackTime`, linhas 156-190) — só precisa relabelar.
- A promoção automática para dama (linha 247) serve para ambos.
- `chess.js` já valida xeque, mate, empate e turnos para os dois lados.

## 4. Estratégias de implementação (3 opções)

**Opção A — `gameMode` dentro do `Board.jsx` atual** (esforço mínimo)
Adiciona um estado `gameMode` (`'ai' | 'local'`) e cerca a lógica de IA com `if`.
Rápido, mas adensa ainda mais um componente já grande.

**Opção B — Extrair um hook `useChessGame` (recomendada)**
Move tabuleiro/turnos/histórico/placar/timer para um hook, e mantém a IA como uma
camada opcional (`useStockfishAI`). `Board` vira apresentação pura. Modo local fica
sendo simplesmente "não plugar a IA". É o caminho mais limpo e o que paga melhor a
longo prazo.

**Opção C — Rotas separadas** (`/game/ai` e `/game/local`)
Dois componentes de página distintos compartilhando subcomponentes. Boa separação
de UX, mas duplica orquestração se não houver o hook da Opção B.

> **Recomendação:** Opção B, opcionalmente combinada com C (uma escolha de modo na
> home ou na tela de setup). Para entrega rápida (aula/demo), a Opção A é aceitável.

## 5. Mudanças concretas necessárias (modo local)

1. **Seleção de modo** — botão/toggle na tela de setup ou na home:
   "Jogar vs IA" × "2 Jogadores (local)".
2. **`handleSquareClick`** — quando `gameMode === 'local'`, remover o bloqueio
   `game.turn() === 'b'`; o jogador da vez é sempre quem joga a cor atual.
3. **Pós-movimento** — não chamar `makeAIMove()` no modo local.
4. **Stockfish** — não inicializar o worker (ou inicializá-lo de forma preguiçosa só
   no modo IA) para economizar recursos.
5. **Setup** — esconder o slider "Rating da IA"; opcionalmente adicionar dois campos
   de nome ("Brancas" / "Pretas"). Manter o slider de tempo.
6. **Resultado** — substituir a lógica de `matchPoints` (centrada em "o humano
   ganhou?") por **vencedor por cor** ("Brancas venceram" / "Pretas venceram" /
   "Empate"). `matchPoints` (+3/+1/-2) não faz sentido no local; ocultar ou
   reinterpretar.
7. **Rótulos** — placar e timer passam a usar os nomes/cores dos jogadores em vez
   de "Jogador" / "IA".

## 6. Considerações de UX

- **Rotação do tabuleiro:** em pass-and-play é comum girar o tabuleiro a cada turno
  (ou oferecer um botão de flip) para o jogador da vez ver suas peças embaixo. Hoje a
  renderização é fixa com brancas embaixo (`Board.jsx:289-304`). É opcional, mas
  melhora muito a experiência.
- **Indicador de "vez de quem":** deixar claro qual humano deve jogar agora.
- **Diálogo de promoção:** hoje promove sempre para dama; para um modo PvP "sério"
  valeria oferecer escolha de peça — opcional.

## 7. Pontos de atenção (fora do escopo, mas relevantes)

- **Inconsistência de schema:** `dbService.js` usa tabela `users` e coluna `uid`, mas
  a migração `supabase/migrations/0001_init.sql` cria `profiles` e `games.user_id`.
  `saveUserProfile` e `saveGameResult` **vão falhar** contra esse banco. Não afeta o
  modo local (que nem precisa de banco), mas é um bug existente.
- **Persistência de partidas locais:** a tabela `games` modela resultado da ótica de
  um usuário (`result` win/loss/draw, `ai_rating`). Uma partida local não tem "dono"
  único — o mais simples é **não salvar** partidas locais, ou salvá-las só sob a conta
  logada com resultado pela ótica das brancas.
- **Credencial commitada:** o `.env.local` contém uma `anon key` real do Supabase. A
  `anon key` é pública por design, mas confirme que o `.env.local` está no
  `.gitignore` e que as políticas RLS estão ativas (estão, na migração).

## 8. Estimativa de esforço

| Item | Esforço |
|---|---|
| Opção A — condicionais em `Board.jsx` + rótulos | ~1-2h |
| Opção B — refatoração para `useChessGame` + isolar IA | ~3-5h |
| Rotação de tabuleiro + nomes de jogadores | +1-2h |
