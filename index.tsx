import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';

// --- Interface para as mensagens do chat ---
interface Message {
  text: string;
  sender: 'user' | 'bot';
  options?: string[];
  redirectUrl?: string;
  redirectButtonText?: string;
}

// --- Validação e Formatação de CPF ---
const validateCpf = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

const formatCpf = (cpf: string): string => {
  cpf = cpf.replace(/\D/g, '');
  cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
  cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
  cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return cpf;
};


// --- Componente Chatbot ---
const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState('start');
  const [userData, setUserData] = useState({ 
    service: '', 
    companyType: '', 
    taxRegime: '', 
    cnpj: '', 
    name: '', 
    cpf: '', 
    phone: '', 
    location: '' 
  });
  const chatboxRef = useRef<HTMLUListElement>(null);
  
  const whatsAppNumber = "5531982318463";

  const chatFlows: Record<string, any> = {
    'Regularização de empresa': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de saber mais sobre regularização de empresa em ${data.location}.`,
      buttonText: "➡️ Ir para o WhatsApp"
    },
    'Licenças e Alvarás': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de saber mais sobre Licenças e Alvarás em ${data.location}.`,
      buttonText: "➡️ Falar no WhatsApp"
    },
    'Regularização Ambiental': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de saber mais sobre Regularização Ambiental em ${data.location}.`,
      buttonText: "➡️ Ir para o WhatsApp"
    },
    'Certidões e Documentações': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de saber mais sobre Certidões e Documentações em ${data.location}.`,
      buttonText: "➡️ Ir para o WhatsApp"
    },
    'Consultoria e Treinamentos': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de saber mais sobre Consultoria e Treinamentos em ${data.location}.`,
      buttonText: "➡️ Falar no WhatsApp"
    },
    'Falar com a equipe MB Regulariza': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de falar com a equipe da MB Regulariza.`,
      buttonText: "➡️ Chamar no WhatsApp"
    },
    'Baixa de Empresa': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (${data.phone}). Gostaria de dar baixa na empresa com CNPJ ${data.cnpj}, localizada em ${data.location}.`,
      buttonText: "➡️ Falar com o atendimento"
    },
    'Regularização de CPF': {
      wppText: (data: typeof userData) => `Olá, tudo bem? Meu nome é ${data.name} (CPF: ${data.cpf}, Tel: ${data.phone}). Gostaria de saber mais sobre regularização de CPF.`,
      buttonText: "➡️ Falar com o atendimento"
    },
  };

  const initialMessage: Message = {
    text: 'Olá! 👋 Eu sou o MB Assistente da MB Regulariza. Como posso ajudar você hoje?',
    sender: 'bot',
    options: [
      'Abrir uma empresa',
      'Baixa de Empresa',
      'Regularização de CPF',
      ...Object.keys(chatFlows).filter(k => !['Baixa de Empresa', 'Regularização de CPF'].includes(k))
    ].sort()
  };

  useEffect(() => {
    setMessages([initialMessage]);
  }, []);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    addMessage({ text: trimmedInput, sender: 'user' });
    setInput('');
    
    let botMessage: Message;
    let nextStep = currentStep;
    const updatedUserData = { ...userData };

    switch (currentStep) {
      case 'awaiting_cnpj':
        updatedUserData.cnpj = trimmedInput;
        botMessage = { text: "Obrigado. Agora, qual o seu nome completo?", sender: 'bot' };
        nextStep = 'awaiting_name';
        break;

      case 'awaiting_name':
        updatedUserData.name = trimmedInput;
        if (updatedUserData.service === 'Regularização de CPF') {
          botMessage = { text: "Qual o seu CPF?", sender: 'bot' };
          nextStep = 'awaiting_cpf';
        } else {
          botMessage = { text: "Qual o seu telefone com DDD?", sender: 'bot' };
          nextStep = 'awaiting_phone';
        }
        break;
      
      case 'awaiting_cpf':
        updatedUserData.cpf = trimmedInput;
        botMessage = { text: "Qual o seu telefone com DDD?", sender: 'bot' };
        nextStep = 'awaiting_phone';
        break;

      case 'awaiting_phone':
        updatedUserData.phone = trimmedInput;
        if (['Falar com a equipe MB Regulariza', 'Regularização de CPF'].includes(updatedUserData.service)) {
          const flow = chatFlows[updatedUserData.service];
          const wppMessage = flow.wppText(updatedUserData);
          const whatsappUrl = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(wppMessage)}`;
          botMessage = {
            text: 'Obrigado! Para continuar, clique no botão abaixo e fale com nossa equipe no WhatsApp.',
            sender: 'bot',
            redirectUrl: whatsappUrl,
            redirectButtonText: flow.buttonText
          };
          nextStep = 'done';
        } else {
          botMessage = { text: "Por favor, me diga o 📍 Estado e 🏙️ Município onde será o processo.", sender: 'bot' };
          nextStep = 'awaiting_location';
        }
        break;

      case 'awaiting_location':
        updatedUserData.location = trimmedInput;
        
        let wppMessage = '';
        let buttonText = '➡️ Falar com o atendimento no WhatsApp';

        if (updatedUserData.service === 'Abrir uma empresa') {
            let companyInfo = updatedUserData.companyType;
            if (updatedUserData.companyType === 'LTDA (ou outro tipo)' && updatedUserData.taxRegime) {
              companyInfo += ` (${updatedUserData.taxRegime})`;
            }
            wppMessage = `Olá, tudo bem? Meu nome é ${updatedUserData.name} (${updatedUserData.phone}). Gostaria de abrir uma empresa do tipo ${companyInfo} em ${updatedUserData.location}.`;
        } else {
          const flow = chatFlows[updatedUserData.service];
          wppMessage = flow.wppText(updatedUserData);
          buttonText = flow.buttonText;
        }

        const whatsappUrl = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(wppMessage)}`;

        botMessage = {
          text: 'Obrigado! Para continuar, clique no botão abaixo e fale com nossa equipe no WhatsApp.',
          sender: 'bot',
          redirectUrl: whatsappUrl,
          redirectButtonText: buttonText
        };
        nextStep = 'done';
        break;

      default:
        botMessage = { ...initialMessage };
        nextStep = 'start';
        break;
    }
    
    setUserData(updatedUserData);
    setCurrentStep(nextStep);
    setTimeout(() => addMessage(botMessage), 500);
  };
  
  const handleOptionClick = (optionText: string) => {
    addMessage({ text: optionText, sender: 'user' });

    let botMessage: Message;
    let nextStep = currentStep;
    
    switch (currentStep) {
      case 'start':
        // Reset user data when starting a new flow to ensure state exclusivity
        const initialUserData = { 
          service: optionText, 
          companyType: '', 
          taxRegime: '', 
          cnpj: '', 
          name: '', 
          cpf: '', 
          phone: '', 
          location: '' 
        };
        setUserData(initialUserData);

        if (optionText === 'Abrir uma empresa') {
          botMessage = {
            text: 'Perfeito! 😊 Qual tipo de empresa você quer abrir?',
            sender: 'bot',
            options: ['MEI', 'LTDA (ou outro tipo)']
          };
          nextStep = 'awaiting_company_type';
        } else if (optionText === 'Baixa de Empresa') {
          botMessage = { text: 'Entendido. Por favor, informe o CNPJ da empresa que deseja dar baixa.', sender: 'bot' };
          nextStep = 'awaiting_cnpj';
        } else if (optionText === 'Regularização de CPF') {
          botMessage = { text: 'Ok. Para iniciar, qual o seu nome completo?', sender: 'bot' };
          nextStep = 'awaiting_name';
        } else {
          botMessage = {
            text: `Entendido! Para o serviço de "${optionText}", qual o seu nome?`,
            sender: 'bot'
          };
          nextStep = 'awaiting_name';
        }
        break;

      case 'awaiting_company_type':
        setUserData(prev => ({ ...prev, companyType: optionText }));
        if (optionText === 'LTDA (ou outro tipo)') {
          botMessage = {
            text: 'Entendido. Qual o regime de tributação desejado?',
            sender: 'bot',
            options: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'Ainda não decidi']
          };
          nextStep = 'awaiting_tax_regime';
        } else { // MEI
          botMessage = {
            text: 'Ok. Para abrir sua empresa, qual o seu nome?',
            sender: 'bot'
          };
          nextStep = 'awaiting_name';
        }
        break;
      
      case 'awaiting_tax_regime':
          setUserData(prev => ({ ...prev, taxRegime: optionText }));
          botMessage = {
            text: 'Ok. Para abrir sua empresa, qual o seu nome?',
            sender: 'bot'
          };
          nextStep = 'awaiting_name';
          break;

      default:
        botMessage = { ...initialMessage };
        nextStep = 'start';
        break;
    }
    
    setCurrentStep(nextStep);
    setTimeout(() => addMessage(botMessage), 500);
  };

  const lastMessage = messages[messages.length - 1];
  const isAwaitingOption = lastMessage?.sender === 'bot' && !!lastMessage.options;
  const isAwaitingInput = ['awaiting_name', 'awaiting_phone', 'awaiting_location', 'awaiting_cnpj', 'awaiting_cpf'].includes(currentStep);
  const isDone = currentStep === 'done';
  
  const getPlaceholderText = () => {
    if (isAwaitingOption) return "Escolha uma opção acima...";
    if (isDone) return "A conversa foi encerrada.";
    if (currentStep === 'awaiting_name') return "Digite seu nome completo...";
    if (currentStep === 'awaiting_phone') return "Digite seu telefone com DDD...";
    if (currentStep === 'awaiting_location') return "Digite o Estado e Município...";
    if (currentStep === 'awaiting_cnpj') return "Digite o CNPJ...";
    if (currentStep === 'awaiting_cpf') return "Digite o CPF...";
    return "Digite sua dúvida...";
  };


  return (
    <div className="chatbot">
      <header>
        <h2>Assistente Virtual</h2>
      </header>
      <ul ref={chatboxRef} className="chatbox">
        {messages.map((msg, index) => (
          <li key={index} className={`chat ${msg.sender === 'user' ? 'outgoing' : 'incoming'}`}>
            {msg.sender === 'bot' && <span className="material-symbols-outlined">smart_toy</span>}
            <div>
              <p>{msg.text}</p>
              {msg.sender === 'bot' && msg.options && index === messages.length - 1 && (
                <div className="quick-reply-options">
                  {msg.options.map((option, i) => (
                    <button key={i} className="quick-reply-button" onClick={() => handleOptionClick(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
               {msg.redirectUrl && index === messages.length - 1 && (
                    <div className="quick-reply-options">
                        <a href={msg.redirectUrl} target="_blank" rel="noopener noreferrer" className="redirect-button">
                            {msg.redirectButtonText}
                        </a>
                    </div>
                )}
            </div>
          </li>
        ))}
      </ul>
      <form className="chat-input" onSubmit={handleSendMessage}>
        <textarea
          placeholder={getPlaceholderText()}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          disabled={isAwaitingOption || isDone || !isAwaitingInput}
          required
        />
        <button id="send-btn" type="submit" className="material-symbols-outlined" disabled={isAwaitingOption || isDone || !isAwaitingInput}>send</button>
      </form>
    </div>
  );
};


// --- Componentes de Ícones ---
const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.001.004 4.274-1.137zm11.368-8.134c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.523.074-.797.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const InstagramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.644-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.44-1.441-1.44z"/>
    </svg>
);


// --- Componente Principal da Aplicação ---
function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    message: ''
  });
  const [cpfError, setCpfError] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);

  const whatsAppNumber = "5531982318463";
  const whatsAppBaseUrl = `https://wa.me/${whatsAppNumber}`;

  const servicesData = [
    {
      icon: 'business_center',
      title: 'Regularização Empresarial',
      description: 'Cuidamos de toda a parte burocrática para que você empreenda com segurança e tranquilidade.',
      items: [
        'Abertura e encerramento de empresas',
        'Alterações contratuais e societárias',
        'MEI (abertura, alteração, baixa)',
        'Regularização junto à Receita Federal (CNPJ e CPF)',
        'Inscrições Estadual e Municipal',
      ],
      whatsappMessage: 'Olá, tudo bem? 😊 Gostaria de saber mais sobre os serviços de Regularização Empresarial.'
    },
    {
      icon: 'gavel',
      title: 'Licenças e Alvarás',
      description: 'Garantimos que sua empresa opere em total conformidade com as exigências legais.',
      items: [
        'Alvará de Localização e Funcionamento',
        'Alvará Sanitário',
        'Alvará / Licença para Publicidade',
        'Licenciamento Ambiental Municipal e Estadual',
      ],
      whatsappMessage: 'Olá, tudo bem? 😊 Gostaria de saber mais sobre Licenças e Alvarás.'
    },
    {
      icon: 'eco',
      title: 'Regularização Ambiental',
      description: 'Soluções completas para manter sua empresa em dia com as normas ambientais.',
      items: [
        'Licenciamento e atualização de processos',
        'Diagnósticos e estudos de impacto ambiental',
        'Consultoria, compliance e auditoria interna',
        'PGRSS (Resíduos de Serviços de Saúde)',
        'Acompanhamento de condicionantes',
      ],
      whatsappMessage: 'Olá, tudo bem? 🌱 Gostaria de saber mais sobre os serviços de Regularização Ambiental.'
    },
    {
      icon: 'description',
      title: 'Certidões e Documentações',
      description: 'Emitimos e regularizamos todos os documentos necessários para a operação da sua empresa.',
      items: [
        'Emissão de certidões (federais, estaduais, etc.)',
        'Regularização de cadastros e registros',
        'Representação técnica junto a órgãos públicos',
      ],
      whatsappMessage: 'Olá, tudo bem? 📑 Gostaria de saber mais sobre Certidões e Documentações.'
    },
    {
      icon: 'school',
      title: 'Consultoria e Treinamentos',
      description: 'Capacitamos empresas e equipes para uma gestão eficiente e sustentável.',
      items: [
        'Treinamentos sobre legislação ambiental',
        'Capacitação em regularização empresarial',
        'Mentoria para empreendedores',
        'Consultoria estratégica e administrativa',
      ],
      whatsappMessage: 'Olá, tudo bem? 🎓 Gostaria de saber mais sobre Consultoria e Treinamentos Empresariais.'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const formattedValue = formatCpf(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formattedValue }));

    if (rawValue.length === 11) {
      if (validateCpf(rawValue)) {
        setCpfError('');
      } else {
        setCpfError('CPF inválido.');
      }
    } else {
      setCpfError('');
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.cpf && !validateCpf(formData.cpf)) {
        setCpfError('Por favor, insira um CPF válido para continuar.');
        return;
    }
    
    const { name, email, phone, cpf, message } = formData;
    const subject = `Contato do Site - ${name}`;
    const body = `Você recebeu uma nova mensagem do formulário de contato do seu site:
    
    Nome: ${name}
    E-mail: ${email}
    Telefone: ${phone}
    CPF: ${cpf || 'Não informado'}
    
    Mensagem:
    ${message}
    `;

    const mailtoLink = `mailto:mbregularizaempresa@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;

    alert('Para concluir, por favor, envie o e-mail que foi aberto em seu aplicativo de e-mail.');
    
    setFormData({ name: '', email: '', phone: '', cpf: '', message: '' });
    setCpfError('');
  };
  
  const Logo = () => (
    <svg width="150" height="80" viewBox="0 0 150 80" xmlns="http://www.w3.org/2000/svg">
      <style>
          {`
              .logo-mb { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 40px; fill: #c6a05a; }
              .logo-text { font-family: 'Playfair Display', serif; font-weight: 400; font-size: 14px; fill: #000000; letter-spacing: 0.05em; }
          `}
      </style>
      <defs>
          <filter id="dropshadow" height="130%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1"/> 
              <feOffset dx="1" dy="1" result="offsetblur"/>
              <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge> 
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/> 
              </feMerge>
          </filter>
      </defs>
      <text x="48" y="35" className="logo-mb" style={{ filter: 'url(#dropshadow)' }}>M</text>
      <text x="70" y="35" className="logo-mb" style={{ filter: 'url(#dropshadow)' }}>B</text>
      
      <text x="75" y="58" textAnchor="middle" className="logo-text">REGULARIZA</text>
      <text x="75" y="75" textAnchor="middle" className="logo-text">EMPRESAS</text>
    </svg>
  );


  return (
    <>
      <header className="header">
        <nav className="container header-nav">
          <a href="#" className="logo">
             <Logo />
          </a>
          <ul className="nav-list">
            <li><a href="#about">Sobre Nós</a></li>
            <li><a href="#services">Serviços</a></li>
            <li><a href="#contact">Contato</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <h1>Descomplique a burocracia. Seu negócio legalizado.</h1>
            <p>Assessoria completa para abertura do ME, CNPJ, alteração de CNPJ e obtenção de alvarás, regularização nos órgãos federais, estaduais e  municipais.</p>
            <div className="hero-highlights">
              <p>📍 Regularizamos empresas em todo o Brasil</p>
              <p>⚖️ Burocracia zero, tudo online</p>
            </div>
            <a href="#about" className="btn btn-primary">Comece Agora</a>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <h2 className="section-title">Sobre Nós</h2>
            <div className="about-content">
              <p className="intro">
                ✨ Prazer, somos a MB Regulariza Empresas.<br/>
                Nascemos com o propósito de facilitar a vida de contadores, empreendedores e empresas que precisam manter sua regularidade em dia.
              </p>
              <p>
                Com experiência sólida na área administrativa e conhecimento jurídico e empresarial, unimos técnica e estratégia para oferecer soluções completas em legalização e documentação empresarial.
              </p>
              <p className="tagline">
                📑 Nós regularizamos, você contabiliza.<br/>
                Nosso foco é que contadores e empresários ganhem tempo, produtividade e segurança, deixando toda a parte burocrática com a gente.
              </p>
            </div>

            <div className="team-members">
              <div className="member">
                <h3>👩‍💼 À frente da empresa está Carla Marques</h3>
                <p>
                  Biomédica, pós-graduada em Processos Gerenciais e pós-graduanda em Direito Comercial e Legislação Empresarial. Com uma visão estratégica e analítica, Carla atua na gestão e regularização de empresas há anos, trazendo eficiência e confiança em cada processo.
                </p>
              </div>
              <div className="member">
                <h3>👩‍💼 Ao lado dela</h3>
                <p>
                  Uma profissional formada em Administração, pós-graduada em Gestão de Equipes e Liderança e com formação em Ciências Contábeis. Com experiência em consultoria financeira, ela traz estratégia, foco e dedicação para impulsionar o crescimento das empresas com confiança e resultados reais.
                </p>
              </div>
            </div>
            
            <div className="mission-values">
                <div className="mission-values-item">
                    <h4>Missão</h4>
                    <p>Simplificar a burocracia empresarial e ambiental, garantindo que nossos clientes atuem com segurança jurídica e sustentabilidade.</p>
                </div>
                <div className="mission-values-item">
                    <h4>Valores</h4>
                    <p>Ética, transparência, eficiência e compromisso com resultados.</p>
                </div>
            </div>

            <div className="about-content" style={{ marginTop: '3rem' }}>
              <p className="outro">
                💼 Aqui, nós cuidamos da legalização, pra você cuidar do seu negócio.
              </p>
            </div>
          </div>
        </section>

        <section id="services" className="section">
          <div className="container">
            <h2 className="section-title">Nossos Serviços</h2>
            <p className="section-subtitle">Soluções completas para a saúde do seu negócio.</p>
            <div className="services-grid">
               {servicesData.map((service, index) => {
                const whatsappUrl = `${whatsAppBaseUrl}?text=${encodeURIComponent(service.whatsappMessage)}`;
                return (
                  <div className="service-card" key={index}>
                    <div>
                      <span className="icon material-symbols-outlined">{service.icon}</span>
                      <h3>{service.title}</h3>
                      <p>{service.description}</p>
                      <ul className="service-list">
                        {service.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="service-card-cta">
                       <a 
                        href={whatsappUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-secondary"
                      >
                        Saiba Mais
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="services-cta-container">
               <a 
                href={`https://wa.me/5531982318463?text=${encodeURIComponent("Olá! Gostaria de solicitar uma consultoria ou treinamento personalizado.")}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary"
              >
                ➡️ Solicite uma consultoria ou treinamento personalizado
              </a>
            </div>
          </div>
        </section>
        
        <section id="contact" className="section">
            <div className="container">
                <h2 className="section-title">Fale Conosco</h2>
                <p className="section-subtitle">Tem alguma dúvida ou quer iniciar seu processo? Entre em contato ou preencha o formulário abaixo.</p>

                <div className="contact-info">
                    <a href={`${whatsAppBaseUrl}?text=${encodeURIComponent("Olá, tudo bem? 👋 Gostaria de falar com a equipe da MB Regulariza Empresas.")}`} target="_blank" rel="noopener noreferrer" className="contact-link">
                        <WhatsAppIcon />
                        <span>WhatsApp</span>
                    </a>
                    <a href="https://www.instagram.com/mbregularizaempresas/" target="_blank" rel="noopener noreferrer" className="contact-link">
                        <InstagramIcon />
                        <span>Instagram</span>
                    </a>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Nome Completo</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">E-mail</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Telefone (com DDD)</label>
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} required />
                    </div>
                    <div className={`form-group ${cpfError ? 'error' : ''}`}>
                        <label htmlFor="cpf">CPF</label>
                        <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleCpfChange} placeholder="000.000.000-00" maxLength={14} />
                        {cpfError && <p className="error-message">{cpfError}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="message">Sua Mensagem</label>
                        <textarea id="message" name="message" rows={5} value={formData.message} onChange={handleInputChange} required></textarea>
                    </div>
                    <button type="submit" className="btn-submit">Enviar Contato</button>
                </form>
            </div>
        </section>

      </main>

       <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <p>&copy; {new Date().getFullYear()} MB Regulariza Empresas. Todos os direitos reservados.</p>
                    <div className="footer-social">
                         <a href={`${whatsAppBaseUrl}?text=${encodeURIComponent("Olá, tudo bem? 👋 Gostaria de falar com a equipe da MB Regulariza Empresas.")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                            <WhatsAppIcon />
                         </a>
                         <a href="https://www.instagram.com/mbregularizaempresas/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                             <InstagramIcon />
                         </a>
                    </div>
                </div>
            </div>
        </footer>


      <button className={`chatbot-toggler ${showChatbot ? 'active' : ''}`} onClick={() => setShowChatbot(prev => !prev)}>
        <span className="material-symbols-outlined mode_comment">mode_comment</span>
        <span className="material-symbols-outlined close">close</span>
      </button>

      {showChatbot && <Chatbot />}
      
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);