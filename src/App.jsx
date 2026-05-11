import { useEffect, useState } from 'react';

const GENEROS = {
  acao: 28, aventura: 12, comedia: 35, terror: 27, romance: 10749, documentario: 99
};

const NOMES_GENEROS = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia',
  36: 'História', 27: 'Terror', 10402: 'Música', 9648: 'Mistério',
  10749: 'Romance', 878: 'Ficção Científica', 10770: 'Cinema TV',
  53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste'
};

function App() {
  // --- ESTADOS DE DADOS ---
  const [filmes, setFilmes] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [filmeSelecionado, setFilmeSelecionado] = useState(null);
  const [atorSelecionado, setAtorSelecionado] = useState(null); // NOVO: Guarda o ator clicado
  const [carregando, setCarregando] = useState(false);
  const [verFavoritos, setVerFavoritos] = useState(false);
  
  // --- DETALHES DO MODAL ---
  const [trailerUrl, setTrailerUrl] = useState('');
  const [provedores, setProvedores] = useState([]);
  const [elenco, setElenco] = useState([]);
  const [filmesSemelhantes, setFilmesSemelhantes] = useState([]);
  const [editandoResenha, setEditandoResenha] = useState(false);
  const [minhaNota, setMinhaNota] = useState(0);
  const [minhaResenha, setMinhaResenha] = useState('');

  // --- INTERFACE ---
  const [ordenacao, setOrdenacao] = useState('padrao');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [toast, setToast] = useState({ visivel: false, mensagem: '' });
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [modoBusca, setModoBusca] = useState({ tipo: 'popular', valor: null });
  const [recomendacoes, setRecomendacoes] = useState([]);

  // --- SISTEMA DE PASTAS ---
  const [favoritos, setFavoritos] = useState(() => {
    try {
      const salvos = localStorage.getItem('meus-favoritos-pastas');
      const dados = salvos ? JSON.parse(salvos) : null;
      return (dados && typeof dados === 'object' && !Array.isArray(dados)) ? dados : { "Geral": [] };
    } catch (e) { return { "Geral": [] }; }
  });
  const [pastaAtual, setPastaAtual] = useState("Geral");
  const [novaPastaNome, setNovaPastaNome] = useState('');

  // --- EFEITOS ---
  useEffect(() => { buscarFilmes(1, { tipo: 'popular', valor: null }); }, []);
  useEffect(() => { localStorage.setItem('meus-favoritos-pastas', JSON.stringify(favoritos)); }, [favoritos]);

  useEffect(() => {
    const lista = favoritos[pastaAtual] || [];
    if (verFavoritos && lista.length > 0) buscarRecomendacoes();
  }, [verFavoritos, pastaAtual, favoritos]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (pesquisa.length > 2) {
        try {
          const chaveAPI = import.meta.env.VITE_TMDB_API_KEY;
          const url = `https://api.themoviedb.org/3/search/movie?api_key=${chaveAPI}&language=pt-BR&query=${pesquisa}&page=1`;
          const resposta = await fetch(url);
          const dados = await resposta.json();
          setSugestoes(dados.results?.slice(0, 5) || []);
          setMostrarSugestoes(true);
        } catch (erro) { console.error(erro); }
      } else {
        setSugestoes([]);
        setMostrarSugestoes(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [pesquisa]);

  // --- FUNÇÕES DE APOIO ---
  const mostrarToast = (mensagem) => {
    setToast({ visivel: true, mensagem });
    setTimeout(() => setToast({ visivel: false, mensagem: '' }), 3000);
  };

  const estaFavoritado = (id) => Object.values(favoritos).some(pasta => pasta.some(f => f.id === id));

  const favoritarOuPerguntar = (filme) => {
    if (estaFavoritado(filme.id)) {
      const novosFavs = { ...favoritos };
      Object.keys(novosFavs).forEach(p => { novosFavs[p] = novosFavs[p].filter(f => f.id !== filme.id); });
      setFavoritos(novosFavs);
      mostrarToast("Removido dos favoritos.");
    } else {
      abrirModal(filme);
      mostrarToast("Escolha uma pasta para salvar!");
    }
  };

  const adicionarAFavoritos = (filme, nomePasta) => {
    if (!nomePasta) return;
    const novosFavs = { ...favoritos };
    Object.keys(novosFavs).forEach(p => { novosFavs[p] = novosFavs[p].filter(f => f.id !== filme.id); });
    novosFavs[nomePasta] = [...novosFavs[nomePasta], { ...filme, minhaNota: 0, minhaResenha: '' }];
    setFavoritos(novosFavs);
    mostrarToast(`Salvo em ${nomePasta}!`);
  };

  const criarPasta = (e) => {
    e.preventDefault();
    const nome = novaPastaNome.trim();
    if (!nome || favoritos[nome]) return;
    setFavoritos({ ...favoritos, [nome]: [] });
    setNovaPastaNome('');
    mostrarToast(`Pasta "${nome}" criada!`);
  };

  const excluirPasta = (e, nome) => {
    e.stopPropagation();
    if (nome === "Geral") return mostrarToast("Pasta Geral é fixa.");
    const novosFavs = { ...favoritos };
    delete novosFavs[nome];
    setFavoritos(novosFavs);
    if (pastaAtual === nome) setPastaAtual("Geral");
    mostrarToast("Pasta removida.");
  };

  const compartilharFilme = async () => {
    if (!filmeSelecionado) return;
    const texto = `Dica de filme: *${filmeSelecionado.title}* 🍿\n\nQue tal assistirmos?`;
    if (navigator.share) {
      try { await navigator.share({ title: filmeSelecionado.title, text: texto }); } 
      catch (erro) { console.log(erro); }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
    }
  };

  // --- ESTATÍSTICAS (DASHBOARD) ---
  const calcularEstatisticas = () => {
    let todosFilmes = [];
    Object.values(favoritos).forEach(pasta => { todosFilmes = [...todosFilmes, ...pasta]; });
    
    // Remove possíveis duplicatas para estatística real
    const filmesUnicos = Array.from(new Set(todosFilmes.map(f => f.id))).map(id => todosFilmes.find(f => f.id === id));
    
    const total = filmesUnicos.length;
    
    const filmesComNota = filmesUnicos.filter(f => f.minhaNota > 0);
    const media = filmesComNota.length > 0 
      ? (filmesComNota.reduce((acc, f) => acc + f.minhaNota, 0) / filmesComNota.length).toFixed(1) 
      : '-';

    const contagemGeneros = {};
    filmesUnicos.forEach(f => {
      if(f.genre_ids) {
        f.genre_ids.forEach(id => { contagemGeneros[id] = (contagemGeneros[id] || 0) + 1; });
      }
    });

    let generoFavId = null;
    let maxCount = 0;
    for (const id in contagemGeneros) {
      if (contagemGeneros[id] > maxCount) {
        maxCount = contagemGeneros[id];
        generoFavId = parseInt(id);
      }
    }
    const generoFavorito = generoFavId ? NOMES_GENEROS[generoFavId] || 'Variado' : '-';

    return { total, media, generoFavorito };
  };

  // --- BUSCAS API ---
  const buscarFilmes = async (paginaAlvo, modo) => {
    setCarregando(true);
    try {
      const chaveAPI = import.meta.env.VITE_TMDB_API_KEY;
      let url = '';
      if (modo.tipo === 'popular') url = `https://api.themoviedb.org/3/movie/popular?api_key=${chaveAPI}&language=pt-BR&page=${paginaAlvo}`;
      else if (modo.tipo === 'pesquisa') url = `https://api.themoviedb.org/3/search/movie?api_key=${chaveAPI}&language=pt-BR&query=${modo.valor}&page=${paginaAlvo}`;
      else if (modo.tipo === 'genero') url = `https://api.themoviedb.org/3/discover/movie?api_key=${chaveAPI}&language=pt-BR&with_genres=${modo.valor}&page=${paginaAlvo}`;

      const resposta = await fetch(url);
      const dados = await resposta.json();
      setFilmes(dados.results || []);
      setPagina(paginaAlvo);
      setModoBusca(modo);
    } catch (erro) { console.error(erro); } 
    finally { setCarregando(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const buscarDadosExtras = async (id) => {
    const chaveAPI = import.meta.env.VITE_TMDB_API_KEY;
    const base = `https://api.themoviedb.org/3/movie/${id}`;
    try {
      const [vids, provs, creds, sim] = await Promise.all([
        fetch(`${base}/videos?api_key=${chaveAPI}&language=pt-BR`).then(r => r.json()),
        fetch(`${base}/watch/providers?api_key=${chaveAPI}`).then(r => r.json()),
        fetch(`${base}/credits?api_key=${chaveAPI}&language=pt-BR`).then(r => r.json()),
        fetch(`${base}/similar?api_key=${chaveAPI}&language=pt-BR&page=1`).then(r => r.json())
      ]);
      const trailer = vids.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      setTrailerUrl(trailer ? `https://www.youtube.com/embed/${trailer.key}` : '');
      setProvedores(provs.results?.BR?.flatrate || []);
      setElenco(creds.cast?.slice(0, 6) || []);
      setFilmesSemelhantes(sim.results?.slice(0, 8) || []);
    } catch (e) { console.error(e); }
  };

  // NOVO: Busca dados de um ator específico
  const buscarDetalhesAtor = async (idAtor) => {
    try {
      const chaveAPI = import.meta.env.VITE_TMDB_API_KEY;
      const res = await fetch(`https://api.themoviedb.org/3/person/${idAtor}?api_key=${chaveAPI}&language=pt-BR&append_to_response=movie_credits`);
      const dados = await res.json();
      setAtorSelecionado({
        ...dados,
        filmes: dados.movie_credits?.cast?.sort((a,b) => b.popularity - a.popularity).slice(0, 12) || []
      });
      const conteudo = document.querySelector('.modal-conteudo');
      if (conteudo) conteudo.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(e) { console.error(e); }
  };

  const buscarRecomendacoes = async () => {
    try {
      const lista = favoritos[pastaAtual] || [];
      if (lista.length === 0) return;
      const chaveAPI = import.meta.env.VITE_TMDB_API_KEY;
      const ultimo = lista[lista.length - 1]; 
      const url = `https://api.themoviedb.org/3/movie/${ultimo.id}/recommendations?api_key=${chaveAPI}&language=pt-BR&page=1`;
      const resposta = await fetch(url);
      const dados = await resposta.json();
      const idsJaSalvos = Object.values(favoritos).flat().map(f => f.id);
      setRecomendacoes(dados.results?.filter(f => !idsJaSalvos.includes(f.id)).slice(0, 10) || []);
    } catch (erro) { console.error(erro); }
  };

  const abrirModal = (filme) => {
    setFilmeSelecionado(filme);
    setAtorSelecionado(null); // Limpa o ator se abrir um novo filme
    buscarDadosExtras(filme.id);
    let filmeFav = null;
    Object.values(favoritos).forEach(pasta => {
      const achado = pasta.find(f => f.id === filme.id);
      if (achado) filmeFav = achado;
    });
    setMinhaNota(filmeFav?.minhaNota || 0);
    setMinhaResenha(filmeFav?.minhaResenha || '');
    setEditandoResenha(false);
    
    setTimeout(() => {
      const conteudo = document.querySelector('.modal-conteudo');
      if (conteudo) conteudo.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const fecharModal = () => {
    setFilmeSelecionado(null);
    setAtorSelecionado(null);
  };

  const salvarResenha = () => {
    const novosFavs = { ...favoritos };
    Object.keys(novosFavs).forEach(p => {
      novosFavs[p] = novosFavs[p].map(f => f.id === filmeSelecionado.id ? { ...f, minhaNota, minhaResenha } : f);
    });
    setFavoritos(novosFavs);
    setEditandoResenha(false);
    mostrarToast("Diário atualizado!");
  };

  const ordenarFilmes = (lista) => {
    if (!lista) return [];
    let l = [...lista];
    if (ordenacao === 'recentes') return l.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    if (ordenacao === 'notas') return l.sort((a, b) => b.vote_average - a.vote_average);
    if (ordenacao === 'alfabetica') return l.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return l;
  };

  const renderizarCartao = (filme) => (
    <div key={filme.id} className="cartao-filme" onClick={() => abrirModal(filme)}>
      <div 
        className={`btn-favorito ${estaFavoritado(filme.id) ? 'ativo' : ''}`} 
        onClick={(e) => { e.stopPropagation(); favoritarOuPerguntar(filme); }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={estaFavoritado(filme.id) ? "var(--brand-yellow)" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
      <img src={filme.poster_path ? `https://image.tmdb.org/t/p/w500${filme.poster_path}` : 'https://via.placeholder.com/500x750?text=Sem+Capa'} alt="" />
      <div className="info-filme">
        <h2>{filme.title}</h2>
        <span className="avaliacao">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:'4px'}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          {filme.vote_average?.toFixed(1)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="container">
      <h1 onClick={() => window.location.reload()} style={{cursor:'pointer'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'10px'}}>
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M7 3v18M17 3v18M3 7h4M3 12h18M3 17h4M17 7h4M17 17h4"/>
        </svg>
        Bilheteria
      </h1>
      
      <nav className="menu">
        <button className={!verFavoritos ? 'ativo' : ''} onClick={() => setVerFavoritos(false)}>Início</button>
        <button className={verFavoritos ? 'ativo' : ''} onClick={() => setVerFavoritos(true)}>Meus Favoritos</button>
      </nav>

      {!verFavoritos ? (
        <>
          <div className="filtros-genero">
            <button onClick={() => buscarFilmes(1, {tipo:'genero', valor: 28})}>AÇÃO</button>
            <button onClick={() => buscarFilmes(1, {tipo:'genero', valor: 12})}>AVENTURA</button>
            <button onClick={() => buscarFilmes(1, {tipo:'genero', valor: 35})}>COMÉDIA</button>
            <button onClick={() => buscarFilmes(1, {tipo:'genero', valor: 27})}>TERROR</button>
            <button onClick={() => buscarFilmes(1, {tipo:'genero', valor: 10749})}>ROMANCE</button>
            <button onClick={() => buscarFilmes(1, {tipo:'genero', valor: 99})}>DOCUMENTÁRIO</button>
          </div>

          <form onSubmit={(e)=>{e.preventDefault(); buscarFilmes(1, {tipo:'pesquisa', valor:pesquisa})}} className="barra-pesquisa">
            <div className="busca-wrapper">
              <input type="text" placeholder="Qual filme você quer assistir?" onChange={(e)=>setPesquisa(e.target.value)} value={pesquisa} onFocus={()=>setMostrarSugestoes(true)} onBlur={()=>setTimeout(()=>setMostrarSugestoes(false),200)} />
              {mostrarSugestoes && sugestoes.length > 0 && (
                <ul className="lista-sugestoes">
                  {sugestoes.map(s => <li key={s.id} onClick={()=>abrirModal(s)}>{s.title}</li>)}
                </ul>
              )}
            </div>
            <button type="submit">Buscar</button>
          </form>

          <div className="barra-ordenacao">
            <label>Ordenar por:</label>
            <div className="custom-select" onClick={() => setDropdownAberto(!dropdownAberto)}>
              <span className="select-selecionado">
                {ordenacao === 'padrao' ? 'Padrão' : ordenacao === 'recentes' ? 'Mais Recentes' : ordenacao === 'notas' ? 'Melhores Notas' : 'Ordem Alfabética'}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFDE00" strokeWidth="2" style={{ transform: dropdownAberto ? 'rotate(180deg)' : 'none', transition: '0.3s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              {dropdownAberto && (
                <ul className="select-opcoes">
                  {['padrao', 'recentes', 'notas', 'alfabetica'].map(opt => (
                    <li key={opt} onClick={() => { setOrdenacao(opt); setDropdownAberto(false); }}>
                      {opt === 'padrao' ? 'Padrão' : opt === 'recentes' ? 'Mais Recentes' : opt === 'notas' ? 'Melhores Notas' : 'Ordem Alfabética'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {carregando ? <div className="carregando">Carregando catálogo...</div> : <div className="grid-filmes">{ordenarFilmes(filmes).map(renderizarCartao)}</div>}

          {!carregando && filmes.length > 0 && (
            <div className="paginacao">
              <button disabled={pagina === 1} onClick={() => buscarFilmes(pagina - 1, modoBusca)}>&larr; Anterior</button>
              <span>Página {pagina}</span>
              <button onClick={() => buscarFilmes(pagina + 1, modoBusca)}>Próxima &rarr;</button>
            </div>
          )}
        </>
      ) : (
        <div className="aba-favoritos-container">
          
          {/* NOVO: DASHBOARD DE ESTATÍSTICAS */}
          <div className="estatisticas-dashboard">
            <div className="estatistica-card">
              <h3>{calcularEstatisticas().total}</h3>
              <p>Filmes Salvos</p>
            </div>
            <div className="estatistica-card">
              <h3>{calcularEstatisticas().media}</h3>
              <p>Nota Média</p>
            </div>
            <div className="estatistica-card">
              <h3>{calcularEstatisticas().generoFavorito}</h3>
              <p>Gênero Favorito</p>
            </div>
          </div>

          <div className="gerenciador-pastas">
            {Object.keys(favoritos).map(nome => (
              <div key={nome} className={`pasta-item ${pastaAtual === nome ? 'ativa' : ''}`} onClick={() => setPastaAtual(nome)}>
                <span>{nome}</span>
              </div>
            ))}
          </div>

          <form onSubmit={criarPasta} className="form-nova-pasta">
            <input type="text" placeholder="Nome da nova pasta..." value={novaPastaNome} onChange={(e) => setNovaPastaNome(e.target.value)} />
            <button type="submit">Criar Pasta</button>
          </form>

          <div className="cabecalho-pasta">
            {pastaAtual !== "Geral" ? (
              <button className="btn-deletar-pasta" onClick={(e) => excluirPasta(e, pastaAtual)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Excluir Pasta
              </button>
            ) : ( <div></div> )}

            {favoritos[pastaAtual]?.length > 0 && (
              <div className="barra-ordenacao" style={{ marginBottom: 0 }}>
                <label>Ordenar por:</label>
                <div className="custom-select" onClick={() => setDropdownAberto(!dropdownAberto)}>
                  <span className="select-selecionado">
                    {ordenacao === 'padrao' ? 'Padrão' : ordenacao === 'recentes' ? 'Mais Recentes' : ordenacao === 'notas' ? 'Melhores Notas' : 'Ordem Alfabética'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFDE00" strokeWidth="2" style={{ transform: dropdownAberto ? 'rotate(180deg)' : 'none', transition: '0.3s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                  {dropdownAberto && (
                    <ul className="select-opcoes">
                      {['padrao', 'recentes', 'notas', 'alfabetica'].map(opt => (
                        <li key={opt} onClick={() => { setOrdenacao(opt); setDropdownAberto(false); }}>
                          {opt === 'padrao' ? 'Padrão' : opt === 'recentes' ? 'Mais Recentes' : opt === 'notas' ? 'Melhores Notas' : 'Ordem Alfabética'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {favoritos[pastaAtual]?.length > 0 ? (
            <div className="grid-filmes">{ordenarFilmes(favoritos[pastaAtual]).map(renderizarCartao)}</div>
          ) : (
            <div className="erro"><p>Nenhum filme nesta pasta.</p></div>
          )}

          {recomendacoes.length > 0 && (
            <div className="secao-recomendacoes">
              <h2 className="titulo-recomendacoes">Dicas baseadas em <span className="destaque-amarelo">"{pastaAtual}"</span></h2>
              <div className="grid-filmes">{recomendacoes.map(renderizarCartao)}</div>
            </div>
          )}
        </div>
      )}

      {filmeSelecionado && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-conteudo" onClick={e => e.stopPropagation()}>
            <button className="botao-fechar" onClick={fecharModal}>&times;</button>
            
            {/* SE O ATOR ESTIVER SELECIONADO, MOSTRA A TELA DELE */}
            {atorSelecionado ? (
              <div className="perfil-ator-modal">
                <button className="btn-voltar-filme" onClick={() => setAtorSelecionado(null)}>
                   &larr; Voltar para {filmeSelecionado.title}
                </button>
                <div className="ator-info-topo">
                  <img src={atorSelecionado.profile_path ? `https://image.tmdb.org/t/p/w300${atorSelecionado.profile_path}` : 'https://via.placeholder.com/300x450?text=Sem+Foto'} alt={atorSelecionado.name} />
                  <div>
                    <h2>{atorSelecionado.name}</h2>
                    <span className="ator-detalhe">Nascimento: {atorSelecionado.birthday ? new Date(atorSelecionado.birthday).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    <p className="ator-bio">{atorSelecionado.biography || "Biografia não disponível em português no momento."}</p>
                  </div>
                </div>
                
                {atorSelecionado.filmes?.length > 0 && (
                  <div className="semelhantes-container">
                    <h3>Conhecido(a) por:</h3>
                    <div className="grid-semelhantes">
                      {atorSelecionado.filmes.map(f => (
                        <div key={f.id} className="cartao-semelhante" onClick={() => abrirModal(f)}>
                          <img src={f.poster_path ? `https://image.tmdb.org/t/p/w185${f.poster_path}` : 'https://via.placeholder.com/185x278?text=S/C'} alt="" />
                          <p>{f.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* CASO CONTRÁRIO, MOSTRA OS DETALHES DO FILME NORMALMENTE */
              <div className="modal-detalhes">
                <img src={`https://image.tmdb.org/t/p/w500${filmeSelecionado.poster_path}`} alt="" />
                <div className="modal-texto">
                  <h2>{filmeSelecionado.title}</h2>
                  <div className="modal-metadados">
                    <span className="avaliacao-modal">⭐ {filmeSelecionado.vote_average?.toFixed(1)}</span>
                    <button className="btn-compartilhar" onClick={compartilharFilme}>Compartilhar</button>
                    <select 
                      className="select-pasta-modal" 
                      value={Object.keys(favoritos).find(p => favoritos[p].some(f => f.id === filmeSelecionado.id)) || ""}
                      onChange={(e) => adicionarAFavoritos(filmeSelecionado, e.target.value)}
                    >
                      <option value="" disabled>Salvar na pasta...</option>
                      {Object.keys(favoritos).map(p => <option key={p} value={p}>{p} {favoritos[p].some(f => f.id === filmeSelecionado.id) ? '✓' : ''}</option>)}
                    </select>
                  </div>

                  <p className="sinopse">{filmeSelecionado.overview}</p>

                  {provedores.length > 0 && (
                    <div className="provedores-container">
                      <h3>Onde Assistir</h3>
                      <div className="lista-provedores">
                        {provedores.map(p => <img key={p.provider_id} src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} title={p.provider_name} alt="" />)}
                      </div>
                    </div>
                  )}

                  {elenco.length > 0 && (
                    <div className="elenco-container">
                      <h3>Elenco Principal</h3>
                      <div className="lista-elenco">
                        {elenco.map(a => (
                          <div key={a.id} className="ator-cartao clicavel" onClick={() => buscarDetalhesAtor(a.id)}>
                            <img src={a.profile_path ? `https://image.tmdb.org/t/p/w185${a.profile_path}` : 'https://via.placeholder.com/185'} alt="" />
                            <p className="ator-nome">{a.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {estaFavoritado(filmeSelecionado.id) && (
                    <div className="resenha-container">
                      <h3>Meu Diário</h3>
                      {!editandoResenha ? (
                        <div className="resenha-exibicao">
                          <div className="minhas-estrelas">{"★".repeat(minhaNota)}{"☆".repeat(5-minhaNota)}</div>
                          <p>{minhaResenha || "Nenhuma anotação ainda."}</p>
                          <button className="btn-editar-resenha" onClick={() => setEditandoResenha(true)}>Editar Diário</button>
                        </div>
                      ) : (
                        <div className="resenha-edicao">
                          <div className="selecao-estrelas">
                            {[1,2,3,4,5].map(n => <span key={n} onClick={() => setMinhaNota(n)} className={n <= minhaNota ? 'ativa' : ''}>★</span>)}
                          </div>
                          <textarea value={minhaResenha} onChange={e => setMinhaResenha(e.target.value)} placeholder="O que achou deste filme?" />
                          <div className="botoes-resenha">
                             <button onClick={salvarResenha}>Salvar</button>
                             <button onClick={() => setEditandoResenha(false)} className="btn-cancelar">Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {trailerUrl && (
                    <div className="trailer-container">
                      <h3>Trailer Oficial</h3>
                      <iframe width="100%" height="315" src={trailerUrl} frameBorder="0" allowFullScreen></iframe>
                    </div>
                  )}

                  {filmesSemelhantes.length > 0 && (
                    <div className="semelhantes-container">
                      <h3>Títulos Semelhantes</h3>
                      <div className="grid-semelhantes">
                        {filmesSemelhantes.map(s => (
                          <div key={s.id} className="cartao-semelhante" onClick={() => abrirModal(s)}>
                            <img src={`https://image.tmdb.org/t/p/w185${s.poster_path}`} alt="" />
                            <p>{s.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className={`toast-notificacao ${toast.visivel ? 'mostrar' : ''}`}>{toast.mensagem}</div>
      <footer className="footer"><p>Desenvolvido com carinho por Maria</p></footer>
    </div>
  );
}

export default App;