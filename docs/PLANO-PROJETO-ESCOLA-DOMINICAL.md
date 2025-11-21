Quero que você atue como um desenvolvedor sênior de React Native/Expo e Firebase e me ajude a construir, passo a passo, um sistema completo de gerenciamento da Escola Dominical da igreja Lagoinha Dublin.

Objetivo geral do projeto

Construir um aplicativo mobile + PWA para gerenciar:

Usuários (alunos, professores, coordenadores, administradores)

Aulas (criação, reserva por professores, publicação, histórico)

Devocionais diários

Notícias

Materiais de apoio (vídeo, PDF, imagens, links, etc.)

Notificações internas

Personalização visual (tema, layout, navegação)

Painel administrativo com estatísticas e gestão avançada


Stack e requisitos técnicos

Editor/IDE: VS Code

Front-end:

React Native com Expo

Expo Router com navegação baseada em arquivos

TypeScript com tipagem estrita (strict: true)

React Native Web para gerar PWA


Backend/BaaS: Firebase

Firebase Authentication

Cloud Firestore (banco principal)

Firebase Storage (upload de arquivos)

Firebase Cloud Functions (para lógicas de backend, “gatilhos” e notificações)


Deploy Web/PWA: Vercel

Build do app web gerado pelo Expo

Configuração de vercel.json para PWA (headers, rewrites, etc.)

Variáveis de ambiente configuradas na Vercel


Controle de acesso / segurança:

Regras de segurança do Firestore simulando Row Level Security por usuário/papel/status

Uso intensivo de Custom Claims no Firebase Authentication para papéis e status


Outros:

AsyncStorage (ou SecureStore) para cache local e sessão

Organização de código em pastas (app, components, contexts, hooks, lib, types, utils)

Padrão de componentes reutilizáveis e UI consistente



Quero que você siga as fases abaixo, sem pular etapas e garantindo que o app esteja sempre compilando e funcional em cada fase.


---

Fase 1: Fundação e Infraestrutura Base

1.1 Configuração do Ambiente

Configurar projeto Expo com TypeScript e Expo Router.

Configurar React Native Web para gerar PWA.

Organizar pastas: app, components, contexts, hooks, lib, types, utils.

Configurar variáveis de ambiente para Firebase (keys, projectId, etc.) usando .env e app.config.

Preparar estrutura mínima para build web (pensando no deploy na Vercel).

Configurar ESLint/Prettier (opcional, mas recomendado).


1.2 Schema do Banco (Firestore)

Criar coleções no Firestore (pensando em índices desde o início):

Coleção users com campos:

id, nome, email, telefone, data_nascimento,

papel, status,

aprovado_por_id, aprovado_em,

alterado_por_id, alterado_em,

papel_anterior, motivo_rejeicao,

created_at, updated_at.


Definir enums conceituais para:

papel: aluno, professor, coordenador, administrador.

status: vazio, pendente, aprovado, rejeitado.


Planejar índices no Firestore (consultas por status, papel, email etc.).


1.3 Sistema de Tipos TypeScript

Criar interfaces/Tipos:

User, UserStatus, UserRole.

Tipos para formulários (ex.: UserFormValues).

Tipos para respostas do Firebase (ex.: wrappers com id, data, etc.).


Criar enums TypeScript sincronizados com os valores armazenados no Firestore.


1.4 Cliente Firebase

Configurar inicialização do Firebase (Auth, Firestore, Storage) em lib/firebase.ts.

Criar helpers para operações comuns (CRUD genérico, ex.: getDocById, listCollection, updateUserProfile).

Configurar AsyncStorage para cache básico (ex.: usuário logado).

Criar utilitário central de tratamento de erros (normalizar mensagens etc.).



---

Fase 2: Sistema de Autenticação Completo

2.1 Contexto de Autenticação

Criar AuthContext com estado global contendo:

Usuário do Firebase Auth

Perfil do usuário (documento em users)


Implementar:

login, logout, signup (email/senha para começar).

Listener de mudanças de sessão do Firebase Auth.

Recarregamento automático do perfil do usuário no Firestore.

Navegação condicional baseada em papel e status (ex.: tela de espera para pendente).



2.2 Telas de Autenticação

Tela de login (com validação de email e senha).

Tela de cadastro (email e senha).

Tela de recuperação de senha (via Firebase Auth).

Tela de redefinição de senha, se necessário.

Validações em tempo real (email válido, senha mínima, etc.).


2.3 Fluxo de Completar Perfil

Após o primeiro cadastro, direcionar para tela “Completar Perfil”:

Campos: telefone, data_nascimento (dd/mm/aaaa).

Validação: telefone com no mínimo 9 dígitos.


Atualizar documento users no Firestore e setar status = "pendente".


2.4 Tela de Espera (Status Pendente)

Criar tela exibida quando status = "pendente".

Mostrar mensagem sobre análise de cadastro.

Bloquear acesso às demais áreas do app.

Incluir botão de logout.


2.5 Funções de Backend para Autenticação (Cloud Functions)

Criar Cloud Function que:

Ao ocorrer signup, cria automaticamente documento em users.


Criar lógica para sincronizar custom claims no Firebase (papel, status) com base no Firestore.

Criar função para atualizar claims quando papel ou status mudar.

Garantir que as regras do Firestore usem essas claims para simular RLS.



---

Fase 3: Papéis, Permissões e Aprovações

3.1 “RLS” com Regras do Firestore

Definir regras de segurança para:

Alunos: leitura de conteúdo publicado.

Professores: leitura + criação de notícias e reservas de aulas.

Coordenadores: gestão de conteúdo e aprovações.

Administradores: acesso completo.


Usar custom claims (role, status) para decidir permissões em todas as coleções críticas.


3.2 Funções de Aprovação (Cloud Functions)

Funções backend para:

Coordenador aprovar/rejeitar usuários (exceto admins).

Administrador aprovar/rejeitar qualquer usuário (inclusive coordenadores).

Alterar papel de usuário com auditoria:

papel_anterior, alterado_por_id, alterado_em.


Registrar quem aprovou e quando (aprovado_por_id, aprovado_em).

Atualizar custom claims após mudança de papel/status.



3.3 Interface de Aprovação para Coordenador

Tela listando usuários pendentes (exceto administradores).

Card de usuário com informações completas: nome, email, telefone, papel desejado, data de cadastro.

Botões “Aprovar” e “Rejeitar”.

Modal para inserir motivo_rejeicao.

Notificação ao usuário após decisão (ex.: documento em notificacoes).


3.4 Interface de Aprovação para Administrador

Tela semelhante, listando todos os pendentes (incluindo coordenadores).

Mesma lógica de aprovação, mas com permissões expandidas.

Função especial para aprovar coordenadores.


3.5 Gerenciamento de Usuários

Tela de administração geral de usuários:

Filtros por status e papel.

Busca por nome, email ou telefone.

Modal para editar papel do usuário.

Modal de confirmação para deletar usuário.

Restrições:

Usuário não pode se deletar.

Admin não pode deletar outro admin.





---

Fase 4: Sistema de Aulas e Reservas

4.1 Schema de Aulas (Firestore)

Coleção aulas com campos:

id, titulo, descricao_base,

data_aula, data_publicacao_auto,

status (rascunho, disponivel, reservada, publicada, arquivada),

criado_por_id, professor_reservado_id,

complemento_professor,

created_at, updated_at, publicado_em, rascunho_salvo_em.


Configurar índices e regras para cada tipo de papel.

4.2 Schema de Reservas

Coleção reservas_aula com campos:

id, aula_id, professor_id,

status (pendente, aprovada, rejeitada),

aprovado_por_id, aprovado_em, motivo_rejeicao, solicitado_em.


Regras Firestore:

Apenas professor pode criar reserva para si.

Apenas coordenador/admin aprova/rejeita.


4.3 Criar e Editar Aulas (Coordenador/Admin)

Tela “Criar Aula”:

Campos: título, descrição base (editor de texto rico), data da aula, data de publicação automática.

Botões:

Salvar rascunho

Marcar como disponível

Publicar agora



Tela “Editar Aula” com os mesmos campos.

Botão para arquivar aula (status = arquivada).


4.4 Sistema de Reservas de Aula (Professor)

Tela com lista de aulas com status = disponivel.

Em cada card, botão “Solicitar Reserva”.

Ao confirmar, criar documento em reservas_aula com status = pendente.

Notificação para coordenadores (via notificacoes + listener em tempo real).


4.5 Aprovação de Reservas (Coordenador/Admin)

Tela com lista de reservas pendentes.

Botões “Aprovar” e “Rejeitar”.

Modal para motivo_rejeicao.

Ao aprovar:

Atualizar aulas.status para reservada.

Definir aulas.professor_reservado_id.


Notificação ao professor.


4.6 Complemento do Professor

Tela para o professor editar complemento_professor apenas nas aulas em que ele é professor_reservado_id.

Editor de texto rico.

Auto-save a cada 3 segundos:

Indicar “salvando...” e “salvo”.


Descrição base bloqueada (apenas coordenador/admin altera).


4.7 Visualização de Aulas (Todos)

Tela com lista de aulas publicadas.

Card com título, data, preview da descrição.

Ordenação por data (mais recente primeiro).

Tela de detalhes da aula:

Título, data, descrição base, complemento, nome do professor.


Estados de loading e vazio.



---

Fase 5: Sistema de Devocionais

5.1 Schema de Devocionais

Coleção devocionais com:

id, titulo, conteudo_base,

data_devocional, data_publicacao_auto,

status (rascunho, disponivel, publicado, arquivado),

criado_por_id, created_at, updated_at, publicado_em, rascunho_salvo_em.


Regra de unicidade lógica:

Não permitir dois devocionais com a mesma data_devocional (Cloud Function ou validação na aplicação).


5.2 Criar e Editar Devocionais (Coordenador/Admin)

Tela de criação:

Editor de texto rico.

Seletor de data do devocional.

Validação para data não duplicada.

Agendamento de publicação automática.

Botões: “Salvar rascunho”, “Publicar agora”.


Tela de edição com botão “Arquivar”.


5.3 Visualização de Devocionais (Todos)

Lista de devocionais publicados.

Card com título, data, preview.

Ordenação por data (mais recente primeiro).

Tela de detalhes do devocional.

Devocional do dia em destaque na home.


5.4 Auto-Save de Rascunhos

Auto-save a cada 3 segundos para:

Aulas

Devocionais


Indicação visual (“salvando” / “salvo”).

Salvar rascunho_salvo_em.

Recuperar rascunho automaticamente ao reabrir.



---

Fase 6: Sistema de Notícias e Materiais de Apoio

6.1 Schema de Notícias

Coleção noticias com:

id, titulo, conteudo,

autor_id, papel_autor,

status (rascunho, publicada),

created_at, updated_at, publicado_em,

data_expiracao, rascunho_salvo_em.


Backend:

Cloud Function para calcular data_expiracao (ex.: 5 dias após publicado_em).

Cloud Function ou rotina para remover/arquivar notícias expiradas.


6.2 Criar e Editar Notícias (Professor/Coordenador/Admin)

Tela “Criar Notícia”:

Editor de texto rico.

Botões: “Salvar rascunho”, “Publicar”.


Tela “Minhas Notícias”:

Filtro por status.

Contador de dias até expiração.


Permitir:

Editar apenas rascunhos.

Deletar notícias próprias.



6.3 Schema de Materiais de Apoio

Coleção materiais_apoio com:

id, tipo_referencia, referencia_id,

tipo_material, nome, descricao,

caminho_storage, url_externa,

tamanho_bytes, mime_type,

enviado_por_id, enviado_em, ordem_exibicao.


Enums:

tipo_referencia: aula, devocional, noticia.

tipo_material: video, pdf, imagem, apresentacao, documento, link, outro.


6.4 Upload e Gestão de Materiais

Configurar pastas/buckets no Firebase Storage.

Implementar upload de múltiplos arquivos.

Validar tamanho e tipo MIME.

Exibir barra de progresso.

Preview de imagens.

Suporte a links externos (YouTube, Vimeo, etc.).

Reordenar ordem_exibicao (drag-and-drop ou botões).

Botão para deletar material.


6.5 Visualização de Materiais (Todos)

Adicionar lista de materiais na tela de detalhes de:

Aula

Devocional

Notícia


Botão para download/abrir material.

Preview inline de imagens e PDFs (quando possível).



---

Fase 7: Sistema de Notificações e Interface de Usuário

7.1 Schema de Notificações

Coleção notificacoes com:

id, usuario_id, tipo, titulo, mensagem,

tipo_referencia, referencia_id,

lida, lida_em, created_at.


Tipos de notificação (tipo):

nova_reserva

reserva_aprovada

reserva_rejeitada

nova_noticia

nova_aula

novo_devocional


7.2 Sistema de Notificações

Cloud Functions / backend para:

Criar notificação ao solicitar reserva (para coordenadores).

Notificar professor quando reserva for aprovada/rejeitada.

Notificar coordenadores quando professor publicar notícia.

Notificar todos quando aula for publicada.

Notificar todos quando devocional for publicado.

Uso de listeners em tempo real do Firestore no app.


7.3 Centro de Notificações

Ícone de sino no header com badge de não lidas.

Tela de lista de notificações:

Marcar como lida ao abrir.

Link direto para o conteúdo referenciado.

Filtro por tipo.

Deletar notificações.

Botão “Marcar todas como lidas”.



7.4 Tela Inicial (Home)

Header com nome do usuário e foto de perfil.

Banner de boas-vindas personalizado.

Card do “Devocional do Dia” (clicável).

Lista das próximas 3 aulas publicadas.

Estado de loading e vazio.

Para professores: seção “Minhas Aulas Reservadas”.


7.5 Tela de Perfil

Tela de visualização:

Foto, nome, email, telefone, data de nascimento, papel.


Badge colorido para o papel (aluno/professor/coordenador/admin).

Botão para editar perfil (nome e telefone).

Validação de telefone.

Botão de logout.


7.6 Navegação e Layout

Barra de navegação inferior (tabs) para mobile:

Home, Aulas, Devocionais, Perfil.


Tab “Notícias” para professores/coordenadores/admins.

Tab “Gerenciar” para coordenadores/admins.

Menu lateral deslizante para coordenadores/admins com todas as opções de gestão.



---

Fase 8: Personalização e Administração Avançada

8.1 Schema de Personalização de Tema

Configurações (coleções ou documentos específicos):

theme_settings:

id, cor_primaria, cor_secundaria, cor_fundo, cor_texto,

cor_texto_secundario, cor_sucesso, cor_erro, cor_aviso, cor_info,

ativo, created_at, updated_at.


layout_settings:

id, espacamento_xs, espacamento_sm, espacamento_md,

espacamento_lg, espacamento_xl, espacamento_xxl,

escala_fonte, raio_borda, intensidade_sombra, estilo_card, padding_componente,

ativo, created_at, updated_at.



Regras Firestore: acesso apenas para administradores.

8.2 Schema de Backgrounds e Navegação

Coleções:

backgrounds:

id, secao, url_imagem, opacidade, posicao, ativo, created_at, updated_at.


navigation_tabs:

id, chave, label, nome_icone, ordem, visivel, created_at, updated_at.


screen_layouts:

id, nome_tela, secao, label_secao, ordem, visivel, tipo_layout, itens_por_linha, created_at, updated_at.



Apenas admins podem alterar.

8.3 Contexto de Tema

Criar ThemeContext para gerenciar tema global.

Carregar configurações do Firestore.

Fazer cache no AsyncStorage.

Criar hook useTheme.

Aplicar tema em todos os componentes principais.


8.4 Interface de Personalização de Tema (Admin)

Tela para alterar cores (color pickers).

Preview em tempo real das mudanças.

Tela para ajustar layout (espaçamentos, fontes, bordas, sombras).

Botão “Restaurar padrão”.

Botão “Salvar alterações” aplicando para todos os usuários.


8.5 Interface de Personalização de Backgrounds (Admin)

Tela para upload de backgrounds por seção.

Slider de opacidade (0–100%).

Seletor de posição da imagem.

Ativar/desativar background por seção.

Preview antes de salvar.


8.6 Interface de Personalização de Navegação (Admin)

Tela para reordenar tabs (drag-and-drop).

Permitir alterar labels das tabs.

Permitir alterar ícones.

Ocultar/mostrar tabs.

Aplicar mudanças imediatamente.


8.7 Interface de Personalização de Layout de Telas (Admin)

Tela para configurar layout por tela:

Tipo de layout (grid, lista, cards).

Número de itens por linha.

Reordenação de seções.

Ocultar/mostrar/renomear seções.



8.8 Dashboard do Administrador

Menu lateral com todas as opções administrativas.

Estatísticas:

Total de usuários por papel.

Total de aulas, devocionais, notícias, etc.


Seção de aprovações pendentes com contadores.

Atalhos rápidos para funcionalidades principais.

Dashboard simplificado para coordenador (sem personalização avançada de tema).


8.9 Sistema de Busca e Filtros

Busca de aulas por título com filtros (status, data, professor).

Busca de devocionais por título/conteúdo com filtros.

Busca de usuários por nome/email/telefone com filtros.

Busca de notícias por título com filtros.

Ordenação customizável.


8.10 Componentes UI Reutilizáveis

Biblioteca de componentes básicos:

Button, Input, Card, Header, Loading, EmptyState, StatusBadge.


Componentes compostos:

UserCard, AulaCard, DevocionalCard, NoticiaCard.


Componentes de modal:

ApprovalModal, EditRoleModal, DeleteConfirmModal.


Componentes de filtro:

UserFilters, DatePicker, StatusFilter.


Editor de texto rico reutilizável para aulas, devocionais e notícias.


8.11 Validações e Segurança Final

Implementar todas as validações de formulários.

Validar regras de negócio (ex.: devocional com data duplicada).

Sanitizar inputs (principalmente rich text).

Proteger contra XSS (sanitize HTML antes de renderizar).

Implementar timeout de sessão, se fizer sentido.

Logs de auditoria para ações críticas (aprovações, mudanças de papel, deleções importantes).


8.12 Deploy e Configuração Final (Vercel)

Gerar build web do projeto Expo (usando o fluxo recomendado atual, ex.: expo export / expo build para web).

Preparar a pasta de saída para deploy na Vercel (por exemplo, apontando a Vercel para a pasta dist/web gerada pelo Expo).

Criar e configurar vercel.json para:

Definir rewrites/redirects necessários.

Configurar headers de PWA (cache, service worker, etc.).


Configurar PWA:

manifest.json (nome, ícones, tema, etc.).

Service worker para cache básico.


Configurar variáveis de ambiente na Vercel:

Chaves do Firebase para produção.

Qualquer URL ou ID de projeto adicional.


Testar responsividade em mobile e web.

Fazer deploy na Vercel e validar:

Login/signup

Regras de segurança

Navegação

PWA (instalação como app, ícone, splash, etc.).




---

Resumo da abordagem que você deve seguir

1. Construir uma base sólida de autenticação e usuários antes de adicionar funcionalidades.


2. Em cada fase, manter o app compilando e testável.


3. Implementar regras de segurança (equivalente a RLS) desde o início com Firestore + custom claims.


4. Criar coleções/estruturas do Firestore na ordem certa, respeitando relacionamentos lógicos.


5. Criar componentes reutilizáveis conforme forem sendo necessários.


6. Deixar a personalização avançada por último, quando toda a estrutura funcional estiver pronta.


7. Sempre que sugerir código, usar TypeScript, Expo Router e seguir a organização de pastas especificada.


8. No fim, gerar build web do Expo e configurar o deploy na Vercel, com vercel.json, manifest.json, service worker e variáveis de ambiente corretas.



Use esse plano fase a fase e me entregue o código e os arquivos necessários em cada etapa, explicando o que foi feito e como rodar no VS Code com Expo e como preparar o deploy na Vercel.