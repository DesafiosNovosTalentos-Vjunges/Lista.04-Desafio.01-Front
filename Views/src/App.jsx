import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function App() {
  // ================= ESTADOS DE AUTENTICAÇÃO =================
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [isLoginView, setIsLoginView] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)

  // ================= ESTADOS DOS POSTS E COMENTÁRIOS =================
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [creatingPost, setCreatingPost] = useState(false)
  const [postError, setPostError] = useState('')

  // Controla quais posts têm a secção de comentários aberta
  const [visibleComments, setVisibleComments] = useState({})
  // Guarda os comentários de cada post (ex: { "post-id-1": [comentarios...], "post-id-2": [...] })
  const [postComments, setPostComments] = useState({})
  // Controla o texto do novo comentário digitado para cada post
  const [newCommentsText, setNewCommentsText] = useState({})

  useEffect(() => {
    if (token) {
      buscarPosts()
    }
  }, [token])

  // ================= FUNÇÕES DE AUTENTICAÇÃO =================
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    setLoadingAuth(true)

    try {
      let response;
      if (isLoginView) {
        response = await api.post('/auth/login', { email, password })
      } else {
        response = await api.post('/auth/register', { 
          name, 
          email, 
          password, 
          password_confirmation: password 
        })
      }
      
      const novoToken = response.data.access_token
      localStorage.setItem('token', novoToken)
      setToken(novoToken)
    } catch (error) {
      if (error.response?.data?.message) {
        setAuthError(error.response.data.message)
      } else {
        setAuthError('Verifique os seus dados e tente novamente.')
      }
    } finally {
      setLoadingAuth(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error(error)
    }
    localStorage.removeItem('token')
    setToken(null)
    setPosts([])
  }

  // ================= FUNÇÕES DOS POSTS =================
  const buscarPosts = async () => {
    setLoadingPosts(true)
    try {
      const response = await api.get('/posts')
      setPosts(response.data)
    } catch (error) {
      if (error.response?.status === 401) handleLogout()
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    setPostError('')
    setCreatingPost(true)

    try {
      const response = await api.post('/posts', {
        title: newPostTitle,
        content: newPostContent
      })
      setPosts([response.data, ...posts])
      setNewPostTitle('')
      setNewPostContent('')
    } catch (error) {
      setPostError('Erro ao publicar o post.')
    } finally {
      setCreatingPost(false)
    }
  }

  // ================= FUNÇÕES DOS COMENTÁRIOS =================
  const toggleComments = async (postId) => {
    // Alterna a visibilidade
    const isNowVisible = !visibleComments[postId]
    setVisibleComments(prev => ({ ...prev, [postId]: isNowVisible }))

    // Se vai abrir e ainda não temos os comentários guardados, vamos buscá-los à API
    if (isNowVisible && !postComments[postId]) {
      try {
        const response = await api.get(`/posts/${postId}/comments`)
        setPostComments(prev => ({ ...prev, [postId]: response.data }))
      } catch (error) {
        console.error("Erro ao procurar comentários:", error)
      }
    }
  }

  const handleAddComment = async (e, postId) => {
    e.preventDefault()
    const content = newCommentsText[postId]
    if (!content) return

    try {
      const response = await api.post(`/posts/${postId}/comments`, { content })
      
      // Adiciona o comentário retornado pela API à lista de comentários do post
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), response.data]
      }))
      
      // Limpa a caixa de texto
      setNewCommentsText(prev => ({ ...prev, [postId]: '' }))
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao adicionar o comentário.')
    }
  }

  // ================= ECRÃ DE AUTENTICAÇÃO =================
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        {/* ... (código do formulário de login mantém-se igual) ... */}
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            {isLoginView ? 'Entrar' : 'Criar Conta'}
          </h1>
          {authError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLoginView && (
              <div>
                <label className="block text-gray-700 font-medium mb-1">Nome</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required={!isLoginView} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="O seu nome"/>
              </div>
            )}
            <div>
              <label className="block text-gray-700 font-medium mb-1">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="seu@email.com"/>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Palavra-passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••"/>
            </div>
            <button type="submit" disabled={loadingAuth} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition cursor-pointer disabled:opacity-50">
              {loadingAuth ? 'A processar...' : (isLoginView ? 'Entrar' : 'Registar')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }} className="text-blue-600 hover:underline text-sm cursor-pointer">
              {isLoginView ? 'Não tem conta? Registe-se aqui' : 'Já tem conta? Inicie sessão'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ================= ECRÃ PRINCIPAL =================
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Meus Posts 🚀</h1>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-medium transition cursor-pointer">
            Sair da conta
          </button>
        </div>

        {/* CRIAR NOVO POST */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">No que está a pensar?</h2>
          {postError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{postError}</div>}
          <form onSubmit={handleCreatePost}>
            <input type="text" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} required placeholder="Título do post..." className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} required rows="3" placeholder="Escreva o conteúdo..." className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            <div className="flex justify-end">
              <button type="submit" disabled={creatingPost || !newPostTitle || !newPostContent} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition cursor-pointer disabled:opacity-50">
                Publicar
              </button>
            </div>
          </form>
        </div>

        {/* LISTA DE POSTS */}
        {loadingPosts ? (
          <p className="text-center text-gray-500 font-medium">A carregar os seus posts do Laravel...</p>
        ) : (
          <div className="space-y-6">
            {posts.length === 0 && <p className="text-center text-gray-500">Nenhum post encontrado.</p>}
            
            {posts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-semibold text-blue-600">{post.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${post.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : post.status === 'ARCHIVED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {post.status}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                <div className="mt-4 text-xs text-gray-400 border-t pt-4 flex justify-between items-center">
                  <span>Publicado em: {new Date(post.created_at).toLocaleDateString('pt-PT')}</span>
                  
                  {/* BOTÃO PARA ABRIR COMENTÁRIOS */}
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="text-blue-500 font-medium hover:underline cursor-pointer"
                  >
                    {visibleComments[post.id] ? 'Esconder Comentários' : 'Ver Comentários'}
                  </button>
                </div>

                {/* SECÇÃO DE COMENTÁRIOS (Expansível) */}
                {visibleComments[post.id] && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-3">Comentários</h3>
                    
                    {/* Lista dos Comentários do Post */}
                    <div className="space-y-3 mb-4">
                      {!postComments[post.id] ? (
                        <p className="text-sm text-gray-500">A carregar...</p>
                      ) : postComments[post.id].length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Ainda não existem comentários. Seja o primeiro!</p>
                      ) : (
                        postComments[post.id].map(comment => (
                          <div key={comment.id} className="bg-white p-3 rounded border border-gray-100 shadow-sm">
                            {/* Assumindo que a sua API traz a relação com o utilizador (author.name) */}
                            <p className="text-xs font-bold text-gray-800 mb-1">
                              {comment.author ? comment.author.name : 'Utilizador'}
                            </p>
                            <p className="text-sm text-gray-600">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulário para novo Comentário */}
                    {post.status !== 'ARCHIVED' ? (
                      <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-2">
                        <input 
                          type="text" 
                          value={newCommentsText[post.id] || ''}
                          onChange={(e) => setNewCommentsText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Escreva um comentário..."
                          required
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer">
                          Enviar
                        </button>
                      </form>
                    ) : (
                      <p className="text-xs text-red-500 italic mt-2">Não é possível comentar em posts arquivados.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App