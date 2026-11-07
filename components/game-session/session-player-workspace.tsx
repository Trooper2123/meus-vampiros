    <nav className="session-mobile-panels" aria-label="Selecionar painel da sessão">{[{id:'center',label:'Hub'},{id:'chat',label:'Chat'},{id:'cameras',label:'Câmeras'}].map(item=><button type="button" key={item.id} aria-pressed={mobilePanel===item.id} className={mobilePanel===item.id?'is-active':''} onClick={()=>setMobilePanel(item.id as 'center'|'chat'|'cameras')}>{item.label}</button>)}</nav>
    <div className="session-player-columns session-player-master-layout" data-mobile-panel={mobilePanel}>
      <aside className="session-player-chat session-chat" aria-label="Chat da sessão">
        <div className="session-column-heading session-player-column-header"><MessageCircle className="size-6 text-primary" aria-hidden="true"/><div><p className="eyebrow">Comunicação</p><h2 className="font-serif text-xl">Chat da Mesa</h2></div></div>
        <div id="session-player-livekit-chat" className="session-chat-mount">
          <div className="session-chat-placeholder session-player-chat-placeholder"><MessageCircle className="size-9 text-primary" strokeWidth={1.25} aria-hidden="true"/><p className="mt-3 text-sm">Chat da sessão via LiveKit</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Entre na mesa virtual à direita para conversar. Mensagens temporárias não são salvas após desconectar.</p></div>
        </div>
      </aside>
      <main className="session-player-center session-center" aria-label="Hub da sessão do jogador">
        <div className="session-center-heading session-player-hub-heading"><div className="session-hub-title"><House className="size-7 text-primary" aria-hidden="true"/><div><h2 className="font-serif text-2xl">Hub da Sessão</h2><p>Seu personagem, a crônica e os recursos compartilhados.</p></div></div><p className="text-xs text-muted-foreground">As abas trocam apenas o conteúdo central.</p></div>
        <div className="session-player-character-banner"><div><p className="eyebrow">Personagem ativo</p><strong>{current?.name??'Sem personagem aprovado'}</strong><span>{sessionId?'Recursos e rolagens disponíveis':'Aguardando abertura da sessão'}</span></div>{characters.length>1&&<label className="session-player-banner-select">Alternar personagem<select value={current?.id??''} onChange={event=>setSelected(event.target.value)}>{characters.map(character=><option key={character.id} value={character.id}>{character.name}</option>)}</select></label>}</div>
        {sessionId && <SessionSoundtrack sessionId={sessionId}/>}

<nav className="session-tabs session-player-tabs session-player-tabs-enhanced" aria-label="Seções do Hub">
  {tabs.map(({ id, label, Icon }) => (
    <button
      type="button"
      key={id}
      aria-current={tab === id ? 'page' : undefined}
      aria-label={label}
      className={`session-tab ${tab === id ? 'session-tab-active is-active' : ''}`}
      onClick={() => setTab(id)}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{label}</span>
      {id === 'messages' && smsUnread > 0 && (
        <span
          className="session-player-unread"
          aria-label={`${smsUnread} mensagens não lidas`}
        >
          {smsUnread}
        </span>
      )}
    </button>
  ))}
</nav>

<section
  className="session-stage session-player-stage"
  aria-label="Conteúdo da seção selecionada"
>
  {tab === 'hub' && (
    <div className="session-player-hub-home">
      <div className="session-player-hub-home-heading">
        <p className="eyebrow">Acesso rápido</p>
        <h3>O que deseja consultar?</h3>
        <p>
          Recursos da sua personagem e materiais compartilhados
          pelo Narrador, sem sair da sessão.
        </p>
      </div>

      <div className="session-player-hub-shortcuts">
        {([
          {
            id: 'sheet',
            label: 'Resumo da Ficha',
            description: current
              ? 'Identidade, atributos, habilidades e disciplinas'
              : 'Nenhuma ficha autorizada',
            Icon: ScrollText,
            disabled: !current,
          },
          {
            id: 'diary',
            label: 'Notas',
            description: 'Anotações e registros da crônica',
            Icon: NotebookPen,
            disabled: false,
          },
          {
            id: 'visual',
            label: 'Mesa Virtual',
            description: 'Mapa e imagens compartilhadas na sessão',
            Icon: ImageIcon,
            disabled: false,
          },
          {
            id: 'files',
            label: 'Handouts',
            description: 'Documentos e pistas liberados para você',
            Icon: FileText,
            disabled: false,
          },
        ] as const).map(({ id, label, description, Icon, disabled }) => (
          <button
            key={id}
            type="button"
            className="session-player-hub-shortcut"
            disabled={disabled}
            onClick={() => setTab(id)}
          >
            <Icon className="size-7" aria-hidden="true" />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <span
              className="session-player-hub-shortcut-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  )}

          {tab==='visual' && <section className="session-player-visual-hub"><div className="session-player-section-heading"><ImageIcon className="size-6"/><div><p className="eyebrow">Compartilhado pelo narrador</p><h2>Mesa Virtual</h2><p>O mapa ou imagem em exibição é sincronizado automaticamente.</p></div></div><SessionVisualBoard campaignId={campaignId}/></section>}
          {tab==='reveals' && <section className="session-player-reveals"><div className="session-player-section-heading"><Eye className="size-6"/><div><p className="eyebrow">Informações reveladas</p><h2>Fofocas e Descobertas</h2><p>Somente informações que o narrador revelou à sua mesa.</p></div></div>{sessionId?<SessionReveals sessionId={sessionId}/>:<p className="text-sm text-muted-foreground">As descobertas aparecerão quando a sessão começar.</p>}</section>}
          {tab==='sheet' && (current ? <>
            
            <PlayerSheet key={current.id} characterId={current.id}/>
          </> : <div className="session-player-empty"><BookOpen className="size-8"/><h2>Nenhuma ficha autorizada nesta mesa</h2><p>Uma ficha aprovada e vinculada é necessária para participar com rolagens e recursos.</p></div>)}
          {tab==='diary' && <div className="session-player-diary"><div className="session-player-section-heading"><NotebookPen className="size-6"/><div><p className="eyebrow">Diário da Crônica</p><h2>Minhas Anotações</h2><p>Registre acontecimentos, agrupe capítulos por marcador e pesquise seus próprios registros.</p></div></div><NotesPanel actorId={actorId} initialCampaignId={campaignId}/></div>}
          {tab==='session' && <div className="session-player-events"><div className="session-player-section-heading"><CalendarDays className="size-6"/><div><p className="eyebrow">Minha participação</p><h2>Calendário e disponibilidade</h2><p>Consulte eventos e informe os dias em que pode participar.</p></div></div><CampaignTools campaignId={campaignId} master={false}/></div>}
          {tab==='messages' && <CharacterSms campaignId={campaignId} mode="player"/>}
          {tab==='files' && <div className="session-player-files"><div className="session-player-section-heading"><FileText className="size-6"/><div><p className="eyebrow">Biblioteca da crônica</p><h2>Handouts e mesa visual</h2><p>Consulte os materiais compartilhados pelo narrador.</p></div></div><CampaignHandouts campaignId={campaignId}/></div>}
        </section>
         {current && sessionId && <PlayerQuickActions characterId={current.id} sessionId={sessionId}/> } 

        {(!current||!sessionId) && <div className="session-player-actions-unavailable">As ações de dados e recursos ficam disponíveis quando uma ficha autorizada participa de uma sessão ativa.</div>}
      </main>
      <aside className="session-player-cameras session-cameras" aria-label="Câmeras da mesa">
        <div className="session-column-heading session-player-column-header"><Users className="size-6 text-primary" aria-hidden="true"/><div><p className="eyebrow">Participantes</p><h2 className="font-serif text-xl">Participantes da mesa</h2></div></div>
        <LiveKitRoomLink campaignId={campaignId} master={false} compact chatTargetId="session-player-livekit-chat"/>
        <SessionParticipants campaignId={campaignId}/><p className="session-player-video-hint">As câmeras permanecem nesta lateral enquanto você navega pelo Hub.</p>