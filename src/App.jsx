import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabase'

const buttons = [
  { emoji: '📈', label: 'Vente', bg: 'bg-green-500' },
  { emoji: '📦', label: 'Achat', bg: 'bg-red-500' },
  { emoji: '💸', label: 'Dépense', bg: 'bg-yellow-400' },
  { emoji: '🤝', label: 'Dette', bg: 'bg-blue-500' },
]

const STORAGE_KEY = 'fetife.dashboard.v1'

function safeNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function formatAmount(value) {
  const n = safeNumber(value)
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isSameLocalDay(isoDate, today) {
  if (!isoDate) return false
  const d = new Date(isoDate)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function getRowCreatedAtIso(row) {
  return (
    row?.createdAt ||
    row?.created_at ||
    row?.created_date ||
    row?.createdDate ||
    row?.date ||
    null
  )
}

function normalizeVenteRow(row) {
  const createdAt = getRowCreatedAtIso(row)
  return {
    ...row,
    article: row?.article ?? '',
    prix: row?.prix_vente ?? row?.prix ?? 0,
    quantite: row?.quantite ?? 0,
    montant: row?.total ?? row?.montant ?? 0,
    createdAt,
  }
}

function normalizeAchatRow(row) {
  const createdAt = getRowCreatedAtIso(row)
  return {
    ...row,
    article: row?.article ?? '',
    prix: row?.prix_achat ?? row?.prix ?? 0,
    quantite: row?.quantite ?? 0,
    montant: row?.total ?? row?.montant ?? 0,
    createdAt,
  }
}

function normalizeDepenseRow(row) {
  const createdAt = getRowCreatedAtIso(row)
  return {
    ...row,
    categorie: row?.categorie ?? '',
    montant: row?.montant ?? row?.total ?? 0,
    createdAt,
  }
}

function normalizeDetteRow(row) {
  const createdAt = getRowCreatedAtIso(row)
  return {
    ...row,
    nom: row?.nom_personne ?? row?.nom ?? '',
    type: row?.type ?? '',
    montant: row?.montant ?? 0,
    description: row?.description ?? '',
    createdAt,
  }
}

function Dashboard({ ventes, achats, depenses, dettes }) {
  const today = new Date()
  const todayLabel = today.toLocaleDateString('fr-FR')

  const ventesAujourdHui = ventes.filter((v) => isSameLocalDay(v.createdAt, today))
  const achatsAujourdHui = achats.filter((a) => isSameLocalDay(a.createdAt, today))
  const depensesAujourdHui = depenses.filter((d) => isSameLocalDay(d.createdAt, today))

  const totalVentes = ventesAujourdHui.reduce((acc, v) => acc + safeNumber(v.montant), 0)
  const totalAchats = achatsAujourdHui.reduce((acc, a) => acc + safeNumber(a.montant), 0)
  const totalDepenses = depensesAujourdHui.reduce((acc, d) => acc + safeNumber(d.montant), 0)

  const beneficeJour = totalVentes - totalAchats - totalDepenses

  const dettesActives = dettes
    .filter((d) => d.type === 'dette')
    .reduce((acc, d) => acc + safeNumber(d.montant), 0)

  // Article le plus rentable (profit = ventes - achats) sur "aujourd'hui"
  const profitParArticle = new Map()
  for (const v of ventesAujourdHui) {
    const key = (v.article || '').trim()
    if (!key) continue
    profitParArticle.set(key, (profitParArticle.get(key) || 0) + safeNumber(v.montant))
  }
  for (const a of achatsAujourdHui) {
    const key = (a.article || '').trim()
    if (!key) continue
    profitParArticle.set(key, (profitParArticle.get(key) || 0) - safeNumber(a.montant))
  }

  let meilleurArticle = null
  let meilleurProfit = -Infinity
  for (const [articleName, profit] of profitParArticle.entries()) {
    if (profit > meilleurProfit) {
      meilleurProfit = profit
      meilleurArticle = articleName
    }
  }

  return (
    <div className="w-full">
      <div className="bg-green-950 rounded-2xl p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-green-200 text-sm font-semibold">Aujourd'hui</div>
            <div className="text-green-50 text-sm font-medium">{todayLabel}</div>
          </div>

          <div className="text-right">
            <div className="text-green-200 text-sm font-semibold">Bénéfice du jour</div>
            <div className="text-white text-3xl font-bold leading-none mt-1">
              {formatAmount(beneficeJour)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          {beneficeJour >= 0 ? (
            <span className="inline-flex items-center rounded-full bg-green-500/20 text-green-100 border border-green-400/30 px-3 py-1 text-xs font-semibold">
              Journée rentable
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-100 border border-red-400/30 px-3 py-1 text-xs font-semibold">
              Journée en perte
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="text-green-700 text-sm font-semibold">Ventes</div>
          <div className="text-green-800 text-3xl font-bold mt-2">{formatAmount(totalVentes)}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-red-700 text-sm font-semibold">Achats</div>
          <div className="text-red-800 text-3xl font-bold mt-2">{formatAmount(totalAchats)}</div>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-orange-700 text-sm font-semibold">Dépenses</div>
          <div className="text-orange-800 text-3xl font-bold mt-2">{formatAmount(totalDepenses)}</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-blue-700 text-sm font-semibold">Dettes actives</div>
          <div className="text-blue-800 text-3xl font-bold mt-2">{formatAmount(dettesActives)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
        <div className="text-3xl" aria-hidden="true">
          🏆
        </div>
        <div className="text-left">
          <div className="text-sm text-gray-500 font-semibold">Article le plus rentable</div>
          <div className="text-lg font-bold text-gray-900">
            {meilleurArticle || 'Aucun article pour le moment'}
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthScreen({
  mode,
  email,
  password,
  loading,
  error,
  info,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}) {
  const isSignIn = mode === 'signin'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl border border-green-100 bg-white p-6 shadow-sm">
        <div className="flex justify-center mb-2">
          <img src="/logo_fetife.png" alt="fetife" className="h-20" />
        </div>
        <p className="text-gray-500 text-center mb-8">Gérez votre activité plus facilement</p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <div className="text-left">
            <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="exemple@mail.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div className="text-left">
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="********"
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold shadow-sm transition-colors"
          >
            {loading ? 'Chargement...' : isSignIn ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <button
          type="button"
          onClick={onToggleMode}
          className="mt-4 w-full text-sm font-medium text-green-700 hover:text-green-800"
        >
          {isSignIn ? 'Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}

function WhatsAppSupportButton() {
  const whatsappSupportUrl =
    'https://wa.me/22997376087?text=Bonjour,%20j%27ai%20besoin%20d%27aide%20avec%20l%27app%20fetife'

  return (
    <a
      href={whatsappSupportUrl}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-1"
      aria-label="Contacter le support WhatsApp"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md">
        <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
          <path d="M19.11 17.27c-.29-.15-1.69-.83-1.95-.93-.26-.09-.45-.14-.64.14-.19.29-.74.93-.91 1.12-.17.2-.34.22-.63.07-.29-.14-1.2-.44-2.29-1.4-.85-.75-1.42-1.67-1.59-1.95-.17-.29-.02-.44.13-.59.13-.12.29-.32.44-.49.14-.17.19-.29.29-.49.1-.2.05-.36-.02-.51-.07-.15-.64-1.54-.88-2.12-.23-.55-.47-.47-.64-.48l-.55-.01c-.2 0-.51.07-.77.36-.26.29-.99.97-.99 2.37s1.01 2.76 1.15 2.95c.14.2 1.98 3.02 4.8 4.23.67.29 1.19.46 1.59.59.67.21 1.27.18 1.75.11.53-.08 1.69-.69 1.93-1.36.24-.68.24-1.26.17-1.37-.07-.12-.26-.2-.55-.34z" />
          <path d="M16.02 3.2c-6.96 0-12.62 5.66-12.62 12.62 0 2.22.58 4.39 1.68 6.29L3.2 28.8l6.88-1.81a12.57 12.57 0 0 0 5.94 1.52h.01c6.96 0 12.62-5.66 12.62-12.62S22.98 3.2 16.02 3.2zm0 23.2h-.01a10.51 10.51 0 0 1-5.36-1.47l-.39-.23-4.08 1.07 1.09-3.98-.25-.41a10.5 10.5 0 1 1 9 5.02z" />
        </svg>
      </span>
      <span className="text-xs font-medium text-gray-600">Aide</span>
    </a>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authInitLoading, setAuthInitLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authInfo, setAuthInfo] = useState('')

  const [screen, setScreen] = useState('home')
  const [article, setArticle] = useState('')
  const [prix, setPrix] = useState('')
  const [quantite, setQuantite] = useState('')
  const [confirmationVisible, setConfirmationVisible] = useState(false)

  const [ventes, setVentes] = useState([])
  const [achats, setAchats] = useState([])
  const [depenses, setDepenses] = useState([])
  const [dettes, setDettes] = useState([])

  const [achatArticle, setAchatArticle] = useState('')
  const [achatPrix, setAchatPrix] = useState('')
  const [achatQuantite, setAchatQuantite] = useState('')
  const [confirmationAchatVisible, setConfirmationAchatVisible] = useState(false)

  const [categorieDepense, setCategorieDepense] = useState('Transport')
  const [montantDepense, setMontantDepense] = useState('')
  const [confirmationDepenseVisible, setConfirmationDepenseVisible] = useState(false)

  const [nomPersonneDette, setNomPersonneDette] = useState('')
  const [typeDette, setTypeDette] = useState('dette')
  const [montantDette, setMontantDette] = useState('')
  const [descriptionDette, setDescriptionDette] = useState('')
  const [confirmationDetteVisible, setConfirmationDetteVisible] = useState(false)

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)

  const storageKey = user?.id ? `${STORAGE_KEY}.${user.id}` : STORAGE_KEY

  const isAndroidChromeForInstall =
    typeof navigator !== 'undefined' &&
    /Android/i.test(navigator.userAgent) &&
    /Chrome/i.test(navigator.userAgent) &&
    !/Edg/i.test(navigator.userAgent)

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true)

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredInstallPrompt(e)
    }
    const onAppInstalled = () => {
      setDeferredInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        const currentSession = data?.session ?? null
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
      })
      .finally(() => {
        if (mounted) {
          setAuthInitLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleAuthSubmit = async () => {
    const email = authEmail.trim()
    const password = authPassword

    if (!email || !password) {
      setAuthError('Veuillez remplir email et mot de passe.')
      return
    }

    setAuthLoading(true)
    setAuthError('')
    setAuthInfo('')

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setAuthInfo('Compte créé. Vérifiez votre email si une confirmation est demandée.')
        setAuthMode('signin')
      }
    } catch (err) {
      setAuthError(err?.message || "Une erreur est survenue pendant l'authentification.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setScreen('home')
    setVentes([])
    setAchats([])
    setDepenses([])
    setDettes([])
  }

  const openVente = () => {
    setScreen('vente')
    setConfirmationVisible(false)
  }

  const openAchat = () => {
    setScreen('achat')
    setConfirmationAchatVisible(false)
  }

  const openDepense = () => {
    setScreen('depense')
    setConfirmationDepenseVisible(false)
  }

  const openDette = () => {
    setScreen('dette')
    setConfirmationDetteVisible(false)
  }

  const goHome = () => {
    setScreen('home')
    setConfirmationVisible(false)
    setConfirmationAchatVisible(false)
    setConfirmationDepenseVisible(false)
    setConfirmationDetteVisible(false)
  }

  const handleEnregistrer = async () => {
    if (!user?.id) return

    const articleTrimmed = article.trim()
    const q = safeNumber(quantite)
    const p = safeNumber(prix)
    const montant = p * q

    if (!articleTrimmed) {
      return
    }

    const createdAtFallback = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('ventes')
        .insert({
          article: articleTrimmed,
          prix_vente: p,
          quantite: q,
          total: montant,
          user_id: user.id,
        })
        .select('*')
        .single()

      if (error) throw error

      const normalized = normalizeVenteRow(data)
      setVentes((prev) => [
        ...prev,
        {
          ...normalized,
          createdAt: normalized.createdAt || createdAtFallback,
          id: normalized.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        },
      ])

      setConfirmationVisible(true)
      setArticle('')
      setPrix('')
      setQuantite('')
    } catch (err) {
      console.error("Erreur Supabase lors de l'enregistrement d'une vente :", err)
    }
  }

  const handleEnregistrerAchat = async () => {
    if (!user?.id) return

    const articleTrimmed = achatArticle.trim()
    const q = safeNumber(achatQuantite)
    const p = safeNumber(achatPrix)
    const montant = p * q

    if (!articleTrimmed) {
      return
    }

    const createdAtFallback = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('achats')
        .insert({
          article: articleTrimmed,
          prix_achat: p,
          quantite: q,
          total: montant,
          user_id: user.id,
        })
        .select('*')
        .single()

      if (error) throw error

      const normalized = normalizeAchatRow(data)
      setAchats((prev) => [
        ...prev,
        {
          ...normalized,
          createdAt: normalized.createdAt || createdAtFallback,
          id: normalized.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        },
      ])

      setConfirmationAchatVisible(true)
      setAchatArticle('')
      setAchatPrix('')
      setAchatQuantite('')
    } catch (err) {
      console.error("Erreur Supabase lors de l'enregistrement d'un achat :", err)
    }
  }

  const handleEnregistrerDepense = async () => {
    if (!user?.id) return

    if (montantDepense === '') {
      return
    }

    const montant = safeNumber(montantDepense)

    const createdAtFallback = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('depenses')
        .insert({
          categorie: categorieDepense,
          montant,
          user_id: user.id,
        })
        .select('*')
        .single()

      if (error) throw error

      const normalized = normalizeDepenseRow(data)
      setDepenses((prev) => [
        ...prev,
        {
          ...normalized,
          createdAt: normalized.createdAt || createdAtFallback,
          id: normalized.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        },
      ])

      setConfirmationDepenseVisible(true)
      setMontantDepense('')
    } catch (err) {
      console.error("Erreur Supabase lors de l'enregistrement d'une dépense :", err)
    }
  }

  const handleEnregistrerDette = async () => {
    if (!user?.id) return

    const nomTrimmed = nomPersonneDette.trim()
    const montant = safeNumber(montantDette)
    if (!nomTrimmed) {
      return
    }

    const createdAtFallback = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('dettes')
        .insert({
          nom_personne: nomTrimmed,
          type: typeDette,
          montant,
          description: descriptionDette.trim(),
          user_id: user.id,
        })
        .select('*')
        .single()

      if (error) throw error

      const normalized = normalizeDetteRow(data)
      setDettes((prev) => [
        ...prev,
        {
          ...normalized,
          createdAt: normalized.createdAt || createdAtFallback,
          id: normalized.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        },
      ])

      setConfirmationDetteVisible(true)
      setNomPersonneDette('')
      setMontantDette('')
      setDescriptionDette('')
    } catch (err) {
      console.error("Erreur Supabase lors de l'enregistrement d'une dette :", err)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function fetchForToday(table, dateColumns) {
      const limit = 2000

      // On essaie de trier par une colonne date (si elle existe dans ton schéma),
      // puis on filtre "aujourd'hui" côté client pour éviter les problèmes de fuseau.
      for (const col of dateColumns) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .order(col, { ascending: false })
          .limit(limit)
        if (!error) return data || []
      }

      const { data, error } = await supabase.from(table).select('*').eq('user_id', user.id).limit(limit)
      if (error) throw error
      return data || []
    }

    async function loadFromSupabase() {
      const today = new Date()

      const ventesRows = await fetchForToday('ventes', ['created_at', 'createdAt', 'created_date'])
      const achatsRows = await fetchForToday('achats', ['created_at', 'createdAt', 'created_date'])
      const depensesRows = await fetchForToday('depenses', ['created_at', 'createdAt', 'created_date'])

      const { data: dettesRows, error: dettesError } = await supabase
        .from('dettes')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000)
      if (dettesError) throw dettesError

      if (cancelled) return

      setVentes((ventesRows || []).map(normalizeVenteRow).filter((v) => isSameLocalDay(v.createdAt, today)))
      setAchats((achatsRows || []).map(normalizeAchatRow).filter((a) => isSameLocalDay(a.createdAt, today)))
      setDepenses((depensesRows || []).map(normalizeDepenseRow).filter((d) => isSameLocalDay(d.createdAt, today)))
      setDettes((dettesRows || []).map(normalizeDetteRow))
    }

    if (!user?.id) {
      setVentes([])
      setAchats([])
      setDepenses([])
      setDettes([])
      return () => {
        cancelled = true
      }
    }

    loadFromSupabase()
      .catch((err) => {
        console.error("Erreur chargement Supabase (fallback localStorage) :", err)
        try {
          const raw = localStorage.getItem(storageKey)
          if (!raw) return
          const parsed = JSON.parse(raw)
          const today = new Date()
          setVentes(
            (Array.isArray(parsed?.ventes) ? parsed.ventes : []).filter((v) => isSameLocalDay(v.createdAt, today)),
          )
          setAchats(
            (Array.isArray(parsed?.achats) ? parsed.achats : []).filter((a) => isSameLocalDay(a.createdAt, today)),
          )
          setDepenses(
            (Array.isArray(parsed?.depenses) ? parsed.depenses : []).filter((d) => isSameLocalDay(d.createdAt, today)),
          )
          setDettes(Array.isArray(parsed?.dettes) ? parsed.dettes : [])
        } catch {
          // Ignore invalid localStorage content
        }
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, storageKey])

  useEffect(() => {
    try {
      if (!user?.id) return
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ventes,
          achats,
          depenses,
          dettes,
        }),
      )
    } catch {
      // Storage may be blocked; app will still work in-memory.
    }
  }, [ventes, achats, depenses, dettes, storageKey, user?.id])

  if (authInitLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (!session || !user) {
    return (
      <AuthScreen
        mode={authMode}
        email={authEmail}
        password={authPassword}
        loading={authLoading}
        error={authError}
        info={authInfo}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
        onToggleMode={() => {
          setAuthError('')
          setAuthInfo('')
          setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
        }}
      />
    )
  }

  if (screen === 'vente') {
    return (
      <div className="min-h-screen bg-white flex flex-col px-4 py-8 max-w-sm mx-auto w-full">
        <header className="flex items-center mb-6">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Retour à l'accueil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </header>

        <h1 className="text-3xl font-bold text-green-600 text-center mb-8">Nouvelle Vente</h1>

        <div className="flex-1 flex flex-col gap-5">
          <div className="text-left">
            <label htmlFor="article" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;article
            </label>
            <input
              id="article"
              type="text"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              placeholder="Ex. T-shirt bleu"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="text-left">
            <label htmlFor="prix" className="block text-sm font-medium text-gray-700 mb-1">
              Prix de vente
            </label>
            <input
              id="prix"
              type="number"
              min="0"
              step="0.01"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="text-left">
            <label htmlFor="quantite" className="block text-sm font-medium text-gray-700 mb-1">
              Quantité vendue
            </label>
            <input
              id="quantite"
              type="number"
              min="0"
              step="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {confirmationVisible && (
          <p className="text-center text-green-700 font-semibold py-3" role="status">
            Vente enregistrée ✅
          </p>
        )}

        <button
          type="button"
          onClick={handleEnregistrer}
          className="w-full mt-4 py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xl font-bold shadow-lg transition-colors"
        >
          Enregistrer
        </button>
        <WhatsAppSupportButton />
      </div>
    )
  }

  if (screen === 'achat') {
    return (
      <div className="min-h-screen bg-white flex flex-col px-4 py-8 max-w-sm mx-auto w-full">
        <header className="flex items-center mb-6">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Retour à l'accueil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </header>

        <h1 className="text-3xl font-bold text-red-600 text-center mb-8">Nouvel Achat</h1>

        <div className="flex-1 flex flex-col gap-5">
          <div className="text-left">
            <label htmlFor="achat-article" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;article acheté
            </label>
            <input
              id="achat-article"
              type="text"
              value={achatArticle}
              onChange={(e) => setAchatArticle(e.target.value)}
              placeholder="Ex. T-shirt bleu"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="text-left">
            <label htmlFor="achat-prix" className="block text-sm font-medium text-gray-700 mb-1">
              Prix d&apos;achat
            </label>
            <input
              id="achat-prix"
              type="number"
              min="0"
              step="0.01"
              value={achatPrix}
              onChange={(e) => setAchatPrix(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="text-left">
            <label htmlFor="achat-quantite" className="block text-sm font-medium text-gray-700 mb-1">
              Quantité achetée
            </label>
            <input
              id="achat-quantite"
              type="number"
              min="0"
              step="1"
              value={achatQuantite}
              onChange={(e) => setAchatQuantite(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        {confirmationAchatVisible && (
          <p className="text-center text-red-700 font-semibold py-3" role="status">
            Achat enregistré ✅
          </p>
        )}

        <button
          type="button"
          onClick={handleEnregistrerAchat}
          className="w-full mt-4 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xl font-bold shadow-lg transition-colors"
        >
          Enregistrer
        </button>
        <WhatsAppSupportButton />
      </div>
    )
  }

  if (screen === 'depense') {
    return (
      <div className="min-h-screen bg-white flex flex-col px-4 py-8 max-w-sm mx-auto w-full">
        <header className="flex items-center mb-6">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Retour à l'accueil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </header>

        <h1 className="text-3xl font-bold text-orange-500 text-center mb-8">Nouvelle Dépense</h1>

        <div className="flex-1 flex flex-col gap-5">
          <div className="text-left">
            <label htmlFor="depense-categorie" className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              id="depense-categorie"
              value={categorieDepense}
              onChange={(e) => setCategorieDepense(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="Transport">Transport</option>
              <option value="Repas">Repas</option>
              <option value="Loyer">Loyer</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div className="text-left">
            <label htmlFor="depense-montant" className="block text-sm font-medium text-gray-700 mb-1">
              Montant de la dépense
            </label>
            <input
              id="depense-montant"
              type="number"
              min="0"
              step="0.01"
              value={montantDepense}
              onChange={(e) => setMontantDepense(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {confirmationDepenseVisible && (
          <p className="text-center text-orange-700 font-semibold py-3" role="status">
            Dépense enregistrée ✅
          </p>
        )}

        <button
          type="button"
          onClick={handleEnregistrerDepense}
          className="w-full mt-4 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold shadow-lg transition-colors"
        >
          Enregistrer
        </button>
        <WhatsAppSupportButton />
      </div>
    )
  }

  if (screen === 'dette') {
    return (
      <div className="min-h-screen bg-white flex flex-col px-4 py-8 max-w-sm mx-auto w-full">
        <header className="flex items-center mb-6">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Retour à l'accueil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </header>

        <h1 className="text-3xl font-bold text-blue-600 text-center mb-8">Dette / Crédit</h1>

        <div className="flex-1 flex flex-col gap-5">
          <div className="text-left">
            <label htmlFor="dette-nom" className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la personne
            </label>
            <input
              id="dette-nom"
              type="text"
              value={nomPersonneDette}
              onChange={(e) => setNomPersonneDette(e.target.value)}
              placeholder="Ex. Marie Dupont"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="text-left">
            <label htmlFor="dette-type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="dette-type"
              value={typeDette}
              onChange={(e) => setTypeDette(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dette">Ce que je dois (dette)</option>
              <option value="credit">Ce qu&apos;on me doit (crédit)</option>
            </select>
          </div>

          <div className="text-left">
            <label htmlFor="dette-montant" className="block text-sm font-medium text-gray-700 mb-1">
              Montant
            </label>
            <input
              id="dette-montant"
              type="number"
              min="0"
              step="0.01"
              value={montantDette}
              onChange={(e) => setMontantDette(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="text-left">
            <label htmlFor="dette-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              id="dette-description"
              value={descriptionDette}
              onChange={(e) => setDescriptionDette(e.target.value)}
              placeholder="Notes…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[5rem]"
            />
          </div>
        </div>

        {confirmationDetteVisible && (
          <p className="text-center text-blue-700 font-semibold py-3" role="status">
            Enregistré ✅
          </p>
        )}

        <button
          type="button"
          onClick={handleEnregistrerDette}
          className="w-full mt-4 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold shadow-lg transition-colors"
        >
          Enregistrer
        </button>
        <WhatsAppSupportButton />
      </div>
    )
  }

  const showInstallBanner =
    screen === 'home' &&
    !isStandalone &&
    isAndroidChromeForInstall &&
    deferredInstallPrompt != null

  const handlePwaInstall = async () => {
    if (!deferredInstallPrompt) return
    deferredInstallPrompt.prompt()
    setDeferredInstallPrompt(null)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom,0px)+5.5rem)]">
      <div className="w-full max-w-sm flex justify-end mb-2">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Déconnexion
        </button>
      </div>
      <div className="mb-2">
        <img src="/logo_fetife.png" alt="fetife" className="h-20" />
      </div>
      <p className="text-gray-500 text-lg mb-10">Gérez votre activité facilement</p>
      <div className="w-full max-w-sm">
        <Dashboard ventes={ventes} achats={achats} depenses={depenses} dettes={dettes} />

        <div className="grid grid-cols-2 gap-4 mt-6">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={
                btn.label === 'Vente'
                  ? openVente
                  : btn.label === 'Achat'
                    ? openAchat
                    : btn.label === 'Dépense'
                      ? openDepense
                      : btn.label === 'Dette'
                        ? openDette
                        : undefined
              }
              className={`${btn.bg} text-white rounded-2xl shadow-md flex flex-col items-center justify-center h-36`}
            >
              <span className="text-5xl mb-2">{btn.emoji}</span>
              <span className="text-xl font-bold">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showInstallBanner && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-green-200/80 bg-green-50/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(22,101,52,0.08)]"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
          role="region"
          aria-label="Installation de l'application"
        >
          <div className="mx-auto flex max-w-sm items-center justify-between gap-3">
            <p className="text-sm font-medium text-green-900/90 leading-snug">
              Installez fetife sur votre téléphone
            </p>
            <button
              type="button"
              onClick={handlePwaInstall}
              className="shrink-0 rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 active:bg-green-900"
            >
              Installer
            </button>
          </div>
        </div>
      )}
      <WhatsAppSupportButton />
    </div>
  )
}

export default App
