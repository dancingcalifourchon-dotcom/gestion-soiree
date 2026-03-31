import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, CheckSquare, Wallet, LayoutDashboard, GripVertical, Plus, 
  Trash2, X, Edit3, Calendar, ChevronLeft, CalendarPlus, CheckCircle2, 
  Clock, Circle, TrendingDown, TrendingUp, Activity, FolderPlus,
  Settings, LogOut, ShieldCheck, Mail, UserPlus, AlertCircle, Sparkles, Loader2
} from 'lucide-react';

// --- UTILITAIRES & IA GEMINI ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// La clé API sera injectée automatiquement par l'environnement
const apiKey = ""; 

const callGeminiWithRetry = async (prompt, schema, retries = 5) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Aucun texte renvoyé par l'IA");
      return JSON.parse(text);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
};

// --- IMAGES FESTIVES (Unsplash) ---
const IMG_LOGIN = "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=2000&q=80"; // Filles trinquant au champagne
const IMG_AGENDA_BANNER = "https://images.unsplash.com/photo-1516997186007-889814421d8b?auto=format&fit=crop&w=2000&q=80"; // Soirée / Fête
const IMG_EVENT_BANNER = "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=2000&q=80"; // Coupes de champagne

// --- DONNÉES INITIALES ---
const defaultAuthorizedUsers = [
  { id: 'u1', email: 'admin@evenement.fr', role: 'admin', name: 'Administrateur' },
  { id: 'u2', email: 'equipe@evenement.fr', role: 'editeur', name: 'Membre Équipe' }
];

const defaultTeamData = [
  { id: 'p1', pole: "Direction Générale & Planification", members: [
      { id: 'm1', task: "Supervision globale du projet", person: "Lya", obs: "SAS 3C" }
  ]},
  { id: 'p2', pole: "Logistique", members: [] }
];

const defaultTaskData = [
  { id: 'c1', category: "Logistique", tasks: [
      { id: 't1', text: "Préparer le matériel", status: "todo" }
  ]}
];

const defaultBudgetData = [
  { id: 'bc1', category: "Communication", items: [
      { id: 'b1', designation: "Flyers", type: "charge", amount: 0 }
  ]}
];

const initialEvents = [
  {
    id: 'evt_1',
    name: 'Soirée de Gala 2026',
    date: '2026-06-12',
    teamData: [
      {
        id: 'p1', pole: "Direction Générale & Planification",
        members: [
          { id: 'm1', task: "Supervision globale du projet & validation", person: "Lya", obs: "SAS 3C" },
          { id: 'm2', task: "Contractualisation animation Orchestres", person: "Yannick", obs: "Ok" },
          { id: 'm3', task: "Planification et suivi du rétroplanning", person: "Yannick", obs: "" }
        ]
      },
      {
        id: 'p2', pole: "Logistique",
        members: [
          { id: 'm5', task: "Gestion du lieu (accès, installation)", person: "Axel", obs: "Lya" }
        ]
      }
    ],
    taskData: [
      {
        id: 'c1', category: "Préparation du bar",
        tasks: [
          { id: 't1', text: "Commande de boissons et gestion du stock", status: "done" },
          { id: 't2', text: "Vérification du matériel (couteaux, doseurs)", status: "in_progress" },
          { id: 't3', text: "Organisation des frigos", status: "todo" }
        ]
      },
      {
        id: 'c2', category: "Organisation des artistes",
        tasks: [
          { id: 't4', text: "Préparation de la glacière loge", status: "todo" },
          { id: 't5', text: "Mise en place du matériel sono", status: "todo" }
        ]
      }
    ],
    budgetData: [
      {
        id: 'bc1', category: "Promo Audio-Visuel", items: [
          { id: 'b1', designation: "Flyers (10 000)", type: "charge", amount: 450 },
          { id: 'b2', designation: "Campagne Radio", type: "charge", amount: 800 }
        ]
      },
      {
        id: 'bc2', category: "Billetterie & Partenaires", items: [
          { id: 'b3', designation: "Ventes sur place (400 x 30€)", type: "recette", amount: 12000 },
          { id: 'b4', designation: "Sponsoring HSM", type: "recette", amount: 1500 }
        ]
      }
    ]
  }
];

// --- COMPOSANTS UI REUTILISABLES ---
const EditableField = ({ value, onSave, type = "text", options = [], className = "" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (tempValue !== value) onSave(type === 'number' ? Number(tempValue) : tempValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setIsEditing(false); setTempValue(value); }
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <select 
          ref={inputRef} value={tempValue} onChange={e => setTempValue(e.target.value)}
          onBlur={handleSave} onKeyDown={handleKeyDown}
          className="border-indigo-500 ring-2 ring-indigo-200 rounded px-2 py-1 text-sm bg-white shadow-sm w-full outline-none"
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
    }
    return (
      <input
        ref={inputRef} type={type} value={tempValue}
        onChange={e => setTempValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown}
        className="border-indigo-500 ring-2 ring-indigo-200 rounded px-2 py-1 text-sm bg-white shadow-sm w-full outline-none"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`group cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded px-1 -mx-1 flex items-center transition-all ${className}`}
      title="Cliquez pour modifier"
    >
      <span className="truncate">{type === 'number' ? `${Number(value).toLocaleString()} €` : (value || '—')}</span>
      <Edit3 size={12} className="ml-2 opacity-0 group-hover:opacity-50 text-indigo-500 flex-shrink-0" />
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/80">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors bg-white rounded-full p-1 shadow-sm">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authorizedUsers, setAuthorizedUsers] = useState(defaultAuthorizedUsers);
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [route, setRoute] = useState('agenda');
  const [activeEventId, setActiveEventId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [events, setEvents] = useState(initialEvents);
  
  const [dragInfo, setDragInfo] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalPayload, setModalPayload] = useState({});

  // États pour l'IA Gemini
  const [generatingTasksId, setGeneratingTasksId] = useState(null);
  const [generatingBudgetId, setGeneratingBudgetId] = useState(null);
  const [aiError, setAiError] = useState("");

  const currentEvent = events.find(e => e.id === activeEventId);

  const updateCurrentEvent = (key, newData) => {
    setEvents(events.map(ev => ev.id === activeEventId ? { ...ev, [key]: newData } : ev));
  };

  const handleSimulateGoogleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value.toLowerCase().trim();
    const user = authorizedUsers.find(u => u.email === email);
    
    if (user) {
      setCurrentUser(user);
      setShowGoogleMock(false);
      setLoginError("");
    } else {
      setLoginError("Accès refusé. Cette adresse n'est pas autorisée.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setRoute('agenda');
    setActiveEventId(null);
  };

  // --- ACTIONS IA GEMINI ---
  const handleSuggestTasks = async (catIndex, categoryName) => {
    setGeneratingTasksId(catIndex);
    setAiError("");
    try {
      const schema = { type: "ARRAY", items: { type: "STRING" } };
      const prompt = `Agis comme un expert en événementiel. Suggère 3 tâches courtes, précises et essentielles pour la catégorie "${categoryName}" de l'événement "${currentEvent.name}". Ne renvoie que les tâches dans un tableau JSON.`;
      const tasks = await callGeminiWithRetry(prompt, schema);

      const nd = [...currentEvent.taskData];
      tasks.forEach(t => {
        nd[catIndex].tasks.push({ id: generateId(), text: t, status: 'todo' });
      });
      updateCurrentEvent('taskData', nd);
    } catch (error) {
      console.error(error);
      setAiError("L'IA n'a pas pu générer de tâches pour le moment.");
    } finally {
      setGeneratingTasksId(null);
    }
  };

  const handleSuggestBudget = async (catIndex, categoryName) => {
    setGeneratingBudgetId(catIndex);
    setAiError("");
    try {
      const schema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            designation: { type: "STRING" },
            amount: { type: "NUMBER" }
          }
        }
      };
      const prompt = `Agis comme un expert en événementiel. Suggère 3 dépenses réalistes et courantes (exemples d'estimations en euros) pour la catégorie budgétaire "${categoryName}" de l'événement "${currentEvent.name}".`;
      const items = await callGeminiWithRetry(prompt, schema);

      const nd = [...currentEvent.budgetData];
      items.forEach(item => {
        nd[catIndex].items.push({
          id: generateId(),
          designation: item.designation,
          type: 'charge',
          amount: item.amount || 0
        });
      });
      updateCurrentEvent('budgetData', nd);
    } catch (error) {
      console.error(error);
      setAiError("L'IA n'a pas pu générer de lignes budgétaires pour le moment.");
    } finally {
      setGeneratingBudgetId(null);
    }
  };

  // --- RENDU : PAGE DE CONNEXION ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex">
        {/* Section Gauche : Formulaire */}
        <div className="w-full lg:w-5/12 xl:w-1/3 bg-white flex flex-col justify-center px-8 sm:px-16 relative z-10 shadow-2xl">
          <div className="max-w-md w-full mx-auto space-y-8 animate-in slide-in-from-left-8 duration-500">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-6 shadow-inner">
                <Sparkles size={32} />
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Espace Gestion</h1>
              <p className="text-slate-500 text-lg">Gérez vos événements d'exception avec élégance et précision.</p>
            </div>
            
            <div className="mt-8">
              {!showGoogleMock ? (
                <button 
                  onClick={() => setShowGoogleMock(true)}
                  className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-4 focus:ring-slate-100 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Connexion Sécurisée Google</span>
                </button>
              ) : (
                <form onSubmit={handleSimulateGoogleLogin} className="space-y-5 animate-in fade-in zoom-in-95">
                  <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-800 p-4 rounded-xl text-sm flex items-start">
                    <ShieldCheck className="flex-shrink-0 mr-3 mt-0.5 text-indigo-500" size={18} />
                    <p>Pour la démonstration, connectez-vous avec : <br/><strong className="text-indigo-900">admin@evenement.fr</strong></p>
                  </div>
                  
                  {loginError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex items-center">
                      <AlertCircle className="mr-3 flex-shrink-0" size={18} />
                      {loginError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse Email Autorisée</label>
                    <input 
                      required 
                      name="email" 
                      type="email" 
                      autoFocus
                      defaultValue="admin@evenement.fr"
                      className="w-full border-slate-300 rounded-xl p-4 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-colors" 
                      placeholder="ex: prenom.nom@gmail.com"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => { setShowGoogleMock(false); setLoginError(""); }}
                      className="flex-1 py-4 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Retour
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-4 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20"
                    >
                      Accéder
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            <div className="text-center pt-8 text-sm text-slate-400">
              <p>&copy; 2026 Espace Gestion Privé. Tous droits réservés.</p>
            </div>
          </div>
        </div>

        {/* Section Droite : Visuel Champagne/Fête */}
        <div className="hidden lg:block lg:w-7/12 xl:w-2/3 relative">
          <div className="absolute inset-0 bg-indigo-900/20 mix-blend-multiply z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 to-transparent z-10"></div>
          <img 
            src={IMG_LOGIN} 
            alt="Soirée élégante avec champagne" 
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000"
          />
          <div className="absolute bottom-12 right-12 z-20 text-right text-white drop-shadow-lg">
            <h2 className="text-4xl font-bold mb-2">Faites pétiller vos événements</h2>
            <p className="text-xl text-white/90 font-light">L'outil parfait pour une organisation sans faille.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIONS GLOBALES ---
  const calculateEventStats = (ev) => {
    let totalTasks = 0, doneTasks = 0, charges = 0, recettes = 0;
    ev.taskData.forEach(cat => {
      totalTasks += cat.tasks.length;
      doneTasks += cat.tasks.filter(t => t.status === 'done').length;
    });
    ev.budgetData.forEach(cat => {
      cat.items.forEach(item => {
        if (item.type === 'charge') charges += item.amount;
        if (item.type === 'recette') recettes += item.amount;
      });
    });
    const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    return { totalTasks, doneTasks, progress, charges, recettes, solde: recettes - charges };
  };

  const globalStats = events.reduce((acc, ev) => {
    const stats = calculateEventStats(ev);
    acc.totalCharges += stats.charges;
    acc.totalRecettes += stats.recettes;
    acc.totalTasks += stats.totalTasks;
    acc.doneTasks += stats.doneTasks;
    return acc;
  }, { totalCharges: 0, totalRecettes: 0, totalTasks: 0, doneTasks: 0 });
  const globalProgress = globalStats.totalTasks === 0 ? 0 : Math.round((globalStats.doneTasks / globalStats.totalTasks) * 100);

  // --- ACTIONS DRAG & DROP ---
  const handleDragStart = (e, parentIndex, itemIndex, type) => {
    setDragInfo({ parentIndex, itemIndex, type });
    e.dataTransfer.effectAllowed = "move";
    e.target.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; setDragInfo(null); };
  const handleDrop = (e, targetParentIndex, targetItemIndex, type) => {
    e.preventDefault();
    if (!dragInfo || dragInfo.type !== type || !currentEvent) return;
    if (dragInfo.parentIndex !== targetParentIndex) return;

    let newData;
    let updateKey;

    if (type === 'budget') {
      newData = [...currentEvent.budgetData];
      const category = newData[targetParentIndex];
      const [draggedItem] = category.items.splice(dragInfo.itemIndex, 1);
      category.items.splice(targetItemIndex, 0, draggedItem);
      updateKey = 'budgetData';
    } else if (type === 'team') {
      newData = [...currentEvent.teamData];
      const pole = newData[targetParentIndex];
      const [draggedItem] = pole.members.splice(dragInfo.itemIndex, 1);
      pole.members.splice(targetItemIndex, 0, draggedItem);
      updateKey = 'teamData';
    } else if (type === 'task') {
      newData = [...currentEvent.taskData];
      const cat = newData[targetParentIndex];
      const [draggedItem] = cat.tasks.splice(dragInfo.itemIndex, 1);
      cat.tasks.splice(targetItemIndex, 0, draggedItem);
      updateKey = 'taskData';
    }
    
    if (newData) updateCurrentEvent(updateKey, newData);
    setDragInfo(null);
  };

  // --- ACTIONS MODALS ---
  const openModal = (type, payload = {}) => { setModalType(type); setModalPayload(payload); setIsModalOpen(true); };
  const submitModal = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    if (modalType === 'addEvent') {
      setEvents([...events, {
        id: generateId(), name: fd.get('name'), date: fd.get('date'),
        teamData: JSON.parse(JSON.stringify(defaultTeamData)),
        taskData: JSON.parse(JSON.stringify(defaultTaskData)),
        budgetData: JSON.parse(JSON.stringify(defaultBudgetData))
      }]);
    }
    else if (modalType === 'addUser') {
      setAuthorizedUsers([...authorizedUsers, {
        id: generateId(), email: fd.get('email').toLowerCase().trim(), name: fd.get('name'), role: fd.get('role')
      }]);
    }
    else if (modalType === 'addTeamMember') {
      const nd = [...currentEvent.teamData];
      nd[modalPayload.poleIndex].members.push({ id: generateId(), task: fd.get('task'), person: fd.get('person'), obs: fd.get('obs') });
      updateCurrentEvent('teamData', nd);
    } 
    else if (modalType === 'addTask') {
      const nd = [...currentEvent.taskData];
      nd[modalPayload.catIndex].tasks.push({ id: generateId(), text: fd.get('text'), status: 'todo' });
      updateCurrentEvent('taskData', nd);
    }
    else if (modalType === 'addBudgetCat') {
      const nd = [...currentEvent.budgetData];
      nd.push({ id: generateId(), category: fd.get('category'), items: [] });
      updateCurrentEvent('budgetData', nd);
    }
    else if (modalType === 'addBudgetItem') {
      const nd = [...currentEvent.budgetData];
      nd[modalPayload.catIndex].items.push({
        id: generateId(), designation: fd.get('designation'), type: fd.get('type'), amount: Number(fd.get('amount'))
      });
      updateCurrentEvent('budgetData', nd);
    }
    setIsModalOpen(false);
  };

  // --- RENDU : AGENDA GLOBAL ---
  const renderAgenda = () => (
    <div className="space-y-8 animate-in fade-in">
      
      {/* BANNIERE HEROS AGENDA */}
      <div className="relative bg-slate-900 rounded-3xl shadow-xl overflow-hidden min-h-[280px] flex items-center justify-center border border-slate-800">
        <img src={IMG_AGENDA_BANNER} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" alt="Ambiance Soirée"/>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        <div className="relative z-10 text-center px-4 w-full max-w-4xl mx-auto py-8">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-2xl">
            <Sparkles className="text-amber-300" size={28} />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Bonjour, {currentUser.name.split(' ')[0]}</h2>
          <p className="text-lg md:text-xl text-slate-300 font-light mb-8">Voici l'état global de vos soirées et événements à venir.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg">
              <p className="text-sm font-medium text-slate-300 mb-1">Événements gérés</p>
              <p className="text-3xl font-bold text-white">{events.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg">
              <p className="text-sm font-medium text-slate-300 mb-1">Avancement global</p>
              <div className="flex items-center justify-between mb-2">
                <p className="text-3xl font-bold text-emerald-400">{globalProgress}%</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${globalProgress}%` }}></div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg">
              <p className="text-sm font-medium text-slate-300 mb-1">Solde global</p>
              <p className={`text-3xl font-bold ${(globalStats.totalRecettes - globalStats.totalCharges) >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {(globalStats.totalRecettes - globalStats.totalCharges).toLocaleString()} €
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            <Calendar className="mr-3 text-indigo-500" /> Mon Agenda Événementiel
          </h2>
          <button 
            onClick={() => openModal('addEvent')}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center transition-all hover:scale-105"
          >
            <CalendarPlus size={18} className="mr-2" /> Créer un événement
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const stats = calculateEventStats(ev);
            return (
              <div 
                key={ev.id} 
                onClick={() => { setRoute('event'); setActiveEventId(ev.id); setActiveTab('dashboard'); }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all group"
              >
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-bold text-xl text-slate-800 group-hover:text-indigo-600 transition-colors mb-2">{ev.name}</h3>
                    <p className="text-sm text-slate-500 flex items-center font-medium bg-slate-50 inline-flex px-2 py-1.5 rounded-lg border border-slate-100">
                      <Calendar size={14} className="mr-2 text-indigo-400" /> {new Date(ev.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/50 transition-colors">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bénéfice Prévu</span>
                    <span className={`text-sm font-bold ${stats.solde >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {stats.solde >= 0 ? '+' : ''}{stats.solde.toLocaleString()} €
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-500 font-bold mb-2 uppercase tracking-wider">
                      <span>Progression</span>
                      <span className={stats.progress === 100 ? 'text-emerald-500' : ''}>{stats.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // --- RENDU : DETAIL EVENEMENT ---
  const renderEventDashboard = () => {
    const stats = calculateEventStats(currentEvent);
    return (
      <div className="space-y-6 animate-in fade-in">
        
        {/* BANNIERE HEROS EVENEMENT */}
        <div className="relative bg-indigo-900 rounded-3xl shadow-lg overflow-hidden min-h-[220px] flex items-center">
          <img src={IMG_EVENT_BANNER} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" alt="Coupes de champagne"/>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-indigo-900/90 to-transparent"></div>
          <div className="relative z-10 p-8 sm:p-10 text-white w-full max-w-3xl">
            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-widest mb-4 border border-white/20 shadow-sm uppercase">
              {new Date(currentEvent.date).toLocaleDateString('fr-FR', { weekday: 'long', day:'numeric', month:'long', year:'numeric' })}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-3 text-white drop-shadow-md tracking-tight">{currentEvent.name}</h2>
            <p className="text-indigo-200 font-medium text-lg sm:text-xl">Préparez un moment inoubliable avec votre équipe.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => setActiveTab('team')} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 flex items-center space-x-5 cursor-pointer hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Users size={28} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">L'Équipe</p>
              <p className="text-2xl font-bold text-slate-800">{currentEvent.teamData.length} Pôles</p>
            </div>
          </div>
          <div onClick={() => setActiveTab('tasks')} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 flex items-center space-x-5 cursor-pointer hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1 transition-all">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckSquare size={28} /></div>
            <div className="w-full">
              <p className="text-sm font-semibold text-slate-500 mb-1">Check-list</p>
              <div className="flex items-center justify-between mb-2">
                <p className="text-2xl font-bold text-slate-800">{stats.progress}%</p>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{stats.doneTasks}/{stats.totalTasks}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
              </div>
            </div>
          </div>
          <div onClick={() => setActiveTab('budget')} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 flex items-center space-x-5 cursor-pointer hover:shadow-lg hover:border-purple-200 hover:-translate-y-1 transition-all">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Wallet size={28} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Budget Prévu</p>
              <p className={`text-2xl font-bold ${stats.solde >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {stats.solde >= 0 ? '+' : ''}{stats.solde.toLocaleString()} €
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeam = () => (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentEvent.teamData.map((pole, pIndex) => (
          <div key={pole.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
              <EditableField 
                value={pole.pole} className="font-extrabold text-slate-800 text-lg w-full"
                onSave={(val) => { const nd = [...currentEvent.teamData]; nd[pIndex].pole = val; updateCurrentEvent('teamData', nd); }} 
              />
            </div>
            <ul className="divide-y divide-slate-100 flex-1">
              {pole.members.map((member, mIndex) => (
                <li 
                  key={member.id} draggable
                  onDragStart={(e) => handleDragStart(e, pIndex, mIndex, 'team')}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, pIndex, mIndex, 'team')}
                  className="px-5 py-4 flex items-center hover:bg-slate-50 transition-colors group bg-white"
                >
                  <GripVertical className="text-slate-300 cursor-grab active:cursor-grabbing mr-4 hidden sm:block" size={18} />
                  <div className="flex-1 min-w-0 pr-4">
                    <EditableField 
                      value={member.task} className="font-semibold text-slate-800 mb-1.5"
                      onSave={(val) => { const nd = [...currentEvent.teamData]; nd[pIndex].members[mIndex].task = val; updateCurrentEvent('teamData', nd); }} 
                    />
                    <div className="flex items-center text-xs text-slate-500">
                      <span className="mr-2 font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase tracking-wider text-[10px]">Note</span>
                      <EditableField 
                        value={member.obs} className="text-slate-500 flex-1 italic"
                        onSave={(val) => { const nd = [...currentEvent.teamData]; nd[pIndex].members[mIndex].obs = val; updateCurrentEvent('teamData', nd); }} 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <EditableField 
                      value={member.person} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-50 text-indigo-700 whitespace-nowrap border border-indigo-100 shadow-sm"
                      onSave={(val) => { const nd = [...currentEvent.teamData]; nd[pIndex].members[mIndex].person = val; updateCurrentEvent('teamData', nd); }} 
                    />
                    <button 
                      onClick={() => { const nd = [...currentEvent.teamData]; nd[pIndex].members.splice(mIndex, 1); updateCurrentEvent('teamData', nd); }}
                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1.5 shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
              <button 
                onClick={() => openModal('addTeamMember', { poleIndex: pIndex })}
                className="w-full py-2.5 flex items-center justify-center text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                <Plus size={18} className="mr-2" /> Ajouter un membre
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTasks = () => {
    const stats = calculateEventStats(currentEvent);
    const statusConfig = {
      'todo': { label: 'À faire', icon: Circle, color: 'text-slate-400', bg: 'bg-slate-100' },
      'in_progress': { label: 'En cours', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
      'done': { label: 'Réalisé', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
    };
    const cycleStatus = (currentStatus) => currentStatus === 'todo' ? 'in_progress' : currentStatus === 'in_progress' ? 'done' : 'todo';

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">Check-list de préparation</h2>
          <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-4 py-2 rounded-xl shadow-sm flex items-center">
            <CheckCircle2 size={18} className="mr-2" /> {stats.doneTasks} / {stats.totalTasks} terminées
          </span>
        </div>

        {aiError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-center font-medium shadow-sm">
            <AlertCircle className="mr-3 flex-shrink-0" size={18} />
            {aiError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {currentEvent.taskData.map((cat, cIndex) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-200">
                <EditableField 
                  value={cat.category} className="font-extrabold text-slate-800 text-lg"
                  onSave={(val) => { const nd = [...currentEvent.taskData]; nd[cIndex].category = val; updateCurrentEvent('taskData', nd); }} 
                />
              </div>
              <ul className="divide-y divide-slate-100 flex-1">
                {cat.tasks.map((task, tIndex) => {
                  const SIcon = statusConfig[task.status].icon;
                  return (
                    <li 
                      key={task.id} draggable
                      onDragStart={(e) => handleDragStart(e, cIndex, tIndex, 'task')}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, cIndex, tIndex, 'task')}
                      className="px-5 py-4 flex items-center group bg-white hover:bg-slate-50 transition-colors"
                    >
                      <GripVertical className="text-slate-300 cursor-grab active:cursor-grabbing mr-3 hidden sm:block flex-shrink-0" size={18} />
                      <div className="flex-1 min-w-0 mr-4">
                        <EditableField 
                          value={task.text} 
                          className={`text-slate-800 w-full font-medium ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}
                          onSave={(val) => { const nd = [...currentEvent.taskData]; nd[cIndex].tasks[tIndex].text = val; updateCurrentEvent('taskData', nd); }} 
                        />
                      </div>
                      <button 
                        onClick={() => { const nd = [...currentEvent.taskData]; nd[cIndex].tasks[tIndex].status = cycleStatus(task.status); updateCurrentEvent('taskData', nd); }}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-current shadow-sm ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}
                      >
                        <SIcon size={14} />
                        <span className="hidden sm:inline">{statusConfig[task.status].label}</span>
                      </button>
                      <button 
                        onClick={() => { const nd = [...currentEvent.taskData]; nd[cIndex].tasks.splice(tIndex, 1); updateCurrentEvent('taskData', nd); }}
                        className="ml-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1.5 bg-white rounded-full shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => openModal('addTask', { catIndex: cIndex })}
                  className="flex-1 py-2.5 flex items-center justify-center text-sm font-bold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm"
                >
                  <Plus size={18} className="mr-2" /> Ajouter
                </button>
                <button 
                  onClick={() => handleSuggestTasks(cIndex, cat.category)}
                  disabled={generatingTasksId === cIndex}
                  className="flex-1 py-2.5 flex items-center justify-center text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                  title="Suggérer des tâches avec l'IA Gemini"
                >
                  {generatingTasksId === cIndex ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" /> Génération...</>
                  ) : (
                    <><Sparkles size={18} className="mr-2" /> ✨ Suggérer</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderBudget = () => {
    const stats = calculateEventStats(currentEvent);
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 border-t-4 border-t-rose-400">
            <p className="text-sm font-semibold text-slate-500 flex items-center mb-2"><TrendingDown className="mr-2 text-rose-500" size={18} /> Total Charges</p>
            <p className="text-3xl font-bold text-slate-800">{stats.charges.toLocaleString()} €</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 border-t-4 border-t-emerald-400">
            <p className="text-sm font-semibold text-slate-500 flex items-center mb-2"><TrendingUp className="mr-2 text-emerald-500" size={18} /> Total Recettes</p>
            <p className="text-3xl font-bold text-slate-800">{stats.recettes.toLocaleString()} €</p>
          </div>
          <div className={`bg-white rounded-2xl shadow-sm p-6 border border-slate-200 border-t-4 ${stats.solde >= 0 ? 'border-t-indigo-500' : 'border-t-amber-500'}`}>
            <p className="text-sm font-semibold text-slate-500 flex items-center mb-2"><Wallet className={`mr-2 ${stats.solde >= 0 ? 'text-indigo-500' : 'text-amber-500'}`} size={18} /> Solde</p>
            <p className={`text-3xl font-bold ${stats.solde >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
               {stats.solde >= 0 ? '+' : ''}{stats.solde.toLocaleString()} €
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
           <h2 className="text-xl font-bold text-slate-800 ml-2">Lignes Budgétaires</h2>
           <button 
            onClick={() => openModal('addBudgetCat')}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md flex items-center"
          >
            <FolderPlus size={18} className="mr-2" /> Créer une Catégorie
          </button>
        </div>

        {aiError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm flex items-center font-medium shadow-sm mb-6">
            <AlertCircle className="mr-3 flex-shrink-0" size={18} />
            {aiError}
          </div>
        )}

        <div className="space-y-6">
          {currentEvent.budgetData.map((cat, cIndex) => (
             <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <EditableField 
                    value={cat.category} className="font-extrabold text-slate-800 text-lg"
                    onSave={(val) => { const nd = [...currentEvent.budgetData]; nd[cIndex].category = val; updateCurrentEvent('budgetData', nd); }} 
                  />
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => handleSuggestBudget(cIndex, cat.category)}
                      disabled={generatingBudgetId === cIndex}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white border border-transparent text-sm font-bold rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center justify-center shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                      title="Suggérer des dépenses avec l'IA Gemini"
                    >
                      {generatingBudgetId === cIndex ? (
                        <><Loader2 size={16} className="mr-2 animate-spin" /> Génération...</>
                      ) : (
                        <><Sparkles size={16} className="mr-2" /> ✨ Suggérer</>
                      )}
                    </button>
                    <button 
                      onClick={() => openModal('addBudgetItem', { catIndex: cIndex })}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white text-indigo-700 border border-indigo-100 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center shadow-sm"
                    >
                      <Plus size={16} className="mr-2" /> Ajouter
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="w-12"></th>
                        <th className="p-4">Désignation</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Montant</th>
                        <th className="w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cat.items.length === 0 && (
                         <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm font-medium">✨ Utilisez l'IA pour générer des idées, ou ajoutez vos propres lignes.</td></tr>
                      )}
                      {cat.items.map((item, index) => (
                        <tr 
                          key={item.id} draggable
                          onDragStart={(e) => handleDragStart(e, cIndex, index, 'budget')}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDrop(e, cIndex, index, 'budget')}
                          className="hover:bg-slate-50 group bg-white transition-colors"
                        >
                          <td className="pl-4 py-3 text-slate-300 cursor-grab active:cursor-grabbing"><GripVertical size={16}/></td>
                          <td className="p-4 text-sm font-bold text-slate-800">
                            <EditableField 
                              value={item.designation} 
                              onSave={(val) => { const nd = [...currentEvent.budgetData]; nd[cIndex].items[index].designation = val; updateCurrentEvent('budgetData', nd); }} 
                            />
                          </td>
                          <td className="p-4 text-sm">
                            <EditableField 
                              type="select" value={item.type} options={[{value: 'charge', label: 'Charge'}, {value: 'recette', label: 'Recette'}]}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${item.type === 'charge' ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100'}`}
                              onSave={(val) => { const nd = [...currentEvent.budgetData]; nd[cIndex].items[index].type = val; updateCurrentEvent('budgetData', nd); }} 
                            />
                          </td>
                          <td className="p-4 text-sm text-right font-bold text-lg">
                             <EditableField 
                              type="number" value={item.amount}
                              className={`justify-end ${item.type === 'charge' ? 'text-rose-600' : 'text-emerald-600'}`}
                              onSave={(val) => { const nd = [...currentEvent.budgetData]; nd[cIndex].items[index].amount = val; updateCurrentEvent('budgetData', nd); }} 
                            />
                          </td>
                          <td className="pr-4 text-right">
                            <button 
                              onClick={() => { const nd = [...currentEvent.budgetData]; nd[cIndex].items.splice(index, 1); updateCurrentEvent('budgetData', nd); }}
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white rounded-full shadow-sm border border-slate-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (currentUser.role !== 'admin') {
      return (
        <div className="bg-white rounded-3xl shadow-sm p-16 text-center border border-slate-200 mt-8">
          <ShieldCheck size={56} className="mx-auto text-slate-300 mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Accès restreint</h2>
          <p className="text-slate-500 text-lg font-medium">Seuls les administrateurs peuvent modifier les paramètres d'accès.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/80 gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center">
                <ShieldCheck className="mr-3 text-indigo-500" size={28}/> Gestion des Accès
              </h2>
              <p className="text-slate-500 mt-2 font-medium">Gérez les comptes autorisés à se connecter à l'application.</p>
            </div>
            <button 
              onClick={() => openModal('addUser')}
              className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center transition-all w-full sm:w-auto justify-center"
            >
              <UserPlus size={20} className="mr-2" /> Ajouter un accès
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-6">Utilisateur</th>
                  <th className="p-6">Email Autorisé</th>
                  <th className="p-6">Rôle</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {authorizedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 text-sm font-bold text-slate-800">{user.name}</td>
                    <td className="p-6 text-sm text-slate-600 font-medium flex items-center">
                      <Mail size={16} className="mr-3 text-slate-400" /> {user.email}
                    </td>
                    <td className="p-6 text-sm">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {user.role === 'admin' ? 'Administrateur' : 'Éditeur'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      {user.id !== currentUser.id ? (
                         <button 
                          onClick={() => setAuthorizedUsers(authorizedUsers.filter(u => u.id !== user.id))}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-2 bg-white rounded-full shadow-sm border border-slate-100"
                          title="Révoquer l'accès"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-bold px-3 py-1.5 bg-slate-100 rounded-lg">Vous-même</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              {route === 'event' && activeEventId ? (
                <>
                  <button 
                    onClick={() => { setRoute('agenda'); setActiveEventId(null); }}
                    className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-all shadow-sm"
                    title="Retour à l'agenda"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div className="flex flex-col ml-2">
                    <span className="font-extrabold text-xl text-slate-900 leading-tight tracking-tight">{currentEvent.name}</span>
                    <span className="text-sm text-indigo-500 font-bold">{new Date(currentEvent.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                </>
              ) : (
                <button 
                  onClick={() => setRoute('agenda')} 
                  className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
                >
                  <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                    <Sparkles className="text-white" size={24}/>
                  </div>
                  <span className="font-extrabold text-2xl tracking-tight text-slate-900">Espace Gestion</span>
                </button>
              )}
            </div>

            {/* Menu Utilisateur Haut Droit */}
            <div className="flex items-center space-x-4 border-l border-slate-200 pl-6 ml-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-xs font-semibold text-slate-500">{currentUser.role === 'admin' ? 'Administrateur' : 'Éditeur'}</span>
              </div>
              <div className="w-11 h-11 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-extrabold text-lg border-2 border-indigo-100 shadow-inner">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center space-x-2 pl-2">
                {currentUser.role === 'admin' && (
                   <button 
                    onClick={() => setRoute('settings')}
                    className={`p-2.5 rounded-xl transition-colors shadow-sm ${route === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                    title="Paramètres d'accès"
                  >
                    <Settings size={20} />
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shadow-sm"
                  title="Se déconnecter"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Navigation latérale */}
        {route === 'event' && activeEventId && (
          <aside className="w-full md:w-64 flex-shrink-0 animate-in slide-in-from-left-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-2 sticky top-28">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
                { id: 'team', icon: Users, label: 'Équipe & Rôles' },
                { id: 'tasks', icon: CheckSquare, label: 'Check-list' },
                { id: 'budget', icon: Wallet, label: 'Budget' }
              ].map((tab) => (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-200 ${
                    activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <tab.icon size={20} className={activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Zone Centrale */}
        <main className="flex-1 min-w-0">
          {route === 'agenda' && renderAgenda()}
          {route === 'settings' && renderSettings()}
          {route === 'event' && activeEventId && activeTab === 'dashboard' && renderEventDashboard()}
          {route === 'event' && activeEventId && activeTab === 'team' && renderTeam()}
          {route === 'event' && activeEventId && activeTab === 'tasks' && renderTasks()}
          {route === 'event' && activeEventId && activeTab === 'budget' && renderBudget()}
        </main>
      </div>

      {/* --- MODALS --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={{
        'addEvent': 'Créer un nouvel événement',
        'addUser': 'Autoriser un nouveau compte',
        'addTeamMember': 'Ajouter un membre à l\'équipe',
        'addTask': 'Ajouter une nouvelle tâche',
        'addBudgetCat': 'Nouvelle catégorie budgétaire',
        'addBudgetItem': 'Ajouter une ligne au budget'
      }[modalType]}>
        <form onSubmit={submitModal} className="space-y-5">
          
          {modalType === 'addUser' && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom de l'utilisateur</label>
                <input required name="name" type="text" autoFocus className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Jean Dupont"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Adresse Email Google autorisée</label>
                <input required name="email" type="email" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: jean.dupont@gmail.com"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Rôle</label>
                <select name="role" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-white outline-none">
                  <option value="editeur">Éditeur (Peut gérer les événements)</option>
                  <option value="admin">Administrateur (Peut gérer événements et accès)</option>
                </select>
              </div>
            </>
          )}

          {modalType === 'addEvent' && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom de l'événement</label>
                <input required name="name" type="text" autoFocus className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Soirée de Gala 2027"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                <input required name="date" type="date" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-white outline-none"/>
              </div>
            </>
          )}

          {modalType === 'addTeamMember' && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Responsabilité / Tâche</label>
                <input required name="task" type="text" autoFocus className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Gestion du bar VIP"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Personne(s) en charge</label>
                <input required name="person" type="text" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Jean / Sophie"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Observations (Optionnel)</label>
                <input name="obs" type="text" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"/>
              </div>
            </>
          )}

          {modalType === 'addTask' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Intitulé de la tâche</label>
              <input required name="text" type="text" autoFocus className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Vérifier les micros"/>
            </div>
          )}

          {modalType === 'addBudgetCat' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nom de la catégorie</label>
              <input required name="category" type="text" autoFocus className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Sécurité & Nettoyage"/>
            </div>
          )}

          {modalType === 'addBudgetItem' && (
            <>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Désignation de la dépense/recette</label>
                <input required name="designation" type="text" autoFocus className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="Ex: Location de tentes"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                  <select name="type" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-white outline-none">
                    <option value="charge">Charge (Dépense)</option>
                    <option value="recette">Recette (Gain)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Montant (€)</label>
                  <input required name="amount" type="number" min="0" step="0.01" className="w-full border-slate-300 rounded-xl p-3 border focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none" placeholder="0.00"/>
                </div>
              </div>
            </>
          )}

          <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
              Annuler
            </button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}