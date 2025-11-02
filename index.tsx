import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat, Type } from "@google/genai";

import './index.css';

// --- Interface para as mensagens do chat ---
interface Message {
  text: string;
  sender: 'user' | 'bot';
  options?: string[];
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
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [collectedData, setCollectedData] = useState<string[]>([]);
  const chatRef = useRef<Chat | null>(null);
  const chatboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `Seu nome é 'MB Assistente'. Você é um assistente virtual especialista da 'MB Regulariza', uma empresa de consultoria e contabilidade focada em MEI e pequenas empresas no Brasil.

Seu objetivo principal é saudar o cliente, entender a necessidade dele (Abrir empresa, Regularizar, Alterar dados), fazer perguntas curtas para qualificar a situação e, em seguida, coletar Nome e WhatsApp.

Regras estritas que você DEVE seguir:
1.  **Fluxo de Coleta:**
    *   Primeiro, qualifique a necessidade do cliente com perguntas de múltipla escolha.
    *   Depois de entender o serviço, peça o **nome completo**.
    *   Depois de receber o nome, peça o **número de WhatsApp com DDD**.
    *   Após receber o número de WhatsApp, a conversa está encerrada.
2.  **Formato da Resposta:** Siga um destes três formatos, sem exceção:
    *   **JSON para Perguntas com Opções:** Se sua resposta for uma pergunta com opções, a resposta DEVE ser APENAS um objeto JSON válido com as chaves "response" (string) e "options" (array de strings).
        *   Exemplo: \`{"response": "Qual o tipo de CNPJ?", "options": ["MEI", "LTDA"]}\`
    *   **Texto Simples para Coleta de Dados:** Se sua resposta for uma pergunta aberta para coletar dados (como nome ou WhatsApp), a resposta DEVE ser texto simples.
        *   Exemplo: "Entendido. Para continuar, por favor, me informe seu nome completo."
    *   **JSON para Finalização:** Ao receber o número do WhatsApp do cliente, sua resposta final DEVE ser APENAS um objeto JSON válido com as chaves "finalMessage" (string) e "redirectToWhatsApp" (boolean \`true\`).
        *   Exemplo: \`{"finalMessage": "Perfeito! Seus dados foram registrados. Você será redirecionado para o nosso WhatsApp para finalizar.", "redirectToWhatsApp": true}\`
3.  **Proibido Aconselhar:** NUNCA forneça conselhos contábeis, financeiros ou legais.
4.  **Proibido Inventar:** NUNCA invente preços, custos ou prazos. Se perguntado, use a resposta padrão.
5.  **Foco na Coleta:** Seu objetivo é SEMPRE seguir o fluxo para coletar as informações e finalizar a conversa para o redirecionamento.
6.  **Resposta Padrão para Preços/Prazos:** Se o cliente perguntar algo que você não sabe (ex: 'quanto custa?'), responda EXATAMENTE com: 'Para te passar um valor preciso, um de nossos especialistas precisa analisar seu caso em detalhes. Posso pegar seu nome e WhatsApp para que ele entre em contato sem compromisso?' (responda em texto simples, não JSON).
7.  **Brevidade:** Mantenha suas respostas curtas e diretas.
8.  **Idioma:** Responda sempre em português brasileiro.`,
          },
        });
        setMessages([{ 
            text: 'Olá! Eu sou o MB Assistente. Como posso ajudar você hoje?', 
            sender: 'bot',
            options: ['Abrir uma empresa', 'Regularizar', 'Alterar dados']
        }]);
      } catch (error) {
        console.error("Erro ao inicializar o chatbot:", error);
        setMessages([{ text: 'Desculpe, não consigo me conectar no momento. Tente mais tarde.', sender: 'bot' }]);
      }
    };
    initChat();
  }, []);
  
  useEffect(() => {
    // Auto-scroll to the latest message
    if (chatboxRef.current) {
        chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (shouldRedirect) {
      // Small delay for user to read the message.
      const timer = setTimeout(() => {
        const companyWhatsApp = "5531982318463";
        const userConversation = collectedData
          .map(item => `- ${item}`)
          .join('\n');

        const prefilledMessage = `Olá, MB Regulariza! Gostaria de um atendimento.\n\n*Resumo da Solicitação:*\n${userConversation}`;
        const whatsappUrl = `https://wa.me/${companyWhatsApp}?text=${encodeURIComponent(prefilledMessage)}`;
        window.open(whatsappUrl, '_blank');
        setShouldRedirect(false); // Reset state
        setCollectedData([]); // Reset collected data for the next chat
      }, 2000);

      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [shouldRedirect, collectedData]);

  const sendMessageToBot = async (messageText: string) => {
    if (!chatRef.current) return;
    setIsLoading(true);
    try {
      const response = await chatRef.current.sendMessage({ message: messageText });
      let botMessage: Message;

      try {
        const parsedData = JSON.parse(response.text ?? '{}');
        
        if (parsedData.redirectToWhatsApp === true) {
            botMessage = {
                text: parsedData.finalMessage || "Obrigado! Estamos te redirecionando para o nosso WhatsApp.",
                sender: 'bot'
            };
            setMessages(prev => [...prev, botMessage]);
            setShouldRedirect(true);
        } else {
             botMessage = {
              text: parsedData.response || "Desculpe, não entendi.",
              sender: 'bot',
              options: parsedData.options || undefined
            };
            setMessages(prev => [...prev, botMessage]);
        }
      } catch (e) {
        botMessage = {
          text: response.text ?? "Desculpe, não entendi.",
          sender: 'bot'
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage = { text: 'Ocorreu um erro. Por favor, tente novamente.', sender: 'bot' as const };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage = { text: trimmedInput, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setCollectedData(prev => [...prev, trimmedInput]);
    setInput('');
    await sendMessageToBot(trimmedInput);
  };

  const handleOptionClick = async (optionText: string) => {
    if (isLoading) return;
    const userMessage = { text: optionText, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setCollectedData(prev => [...prev, optionText]);
    await sendMessageToBot(optionText);
  };

  const lastMessage = messages[messages.length - 1];
  const isAwaitingOption = lastMessage?.sender === 'bot' && !!lastMessage.options;

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
            </div>
          </li>
        ))}
         {isLoading && <li className="chat incoming"><span className="material-symbols-outlined">smart_toy</span><p>Digitando...</p></li>}
      </ul>
      <form className="chat-input" onSubmit={handleSendMessage}>
        <textarea 
          placeholder={isAwaitingOption ? "Escolha uma opção acima..." : "Digite sua dúvida..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          disabled={isAwaitingOption}
          required 
        />
        <button id="send-btn" type="submit" className="material-symbols-outlined" disabled={isAwaitingOption}>send</button>
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
              
              <div className="service-card">
                <span className="icon material-symbols-outlined">business_center</span>
                <h3>Regularização Empresarial</h3>
                <p>Cuidamos de toda a parte burocrática para que você empreenda com segurança e tranquilidade.</p>
                <ul className="service-list">
                  <li>Abertura e encerramento de empresas</li>
                  <li>Alterações contratuais e societárias</li>
                  <li>MEI (abertura, alteração, baixa)</li>
                  <li>Regularização junto à Receita Federal (CNPJ e CPF)</li>
                  <li>Inscrições Estadual e Municipal</li>
                </ul>
              </div>

              <div className="service-card">
                <span className="icon material-symbols-outlined">gavel</span>
                <h3>Licenças e Alvarás</h3>
                <p>Garantimos que sua empresa opere em total conformidade com as exigências legais.</p>
                 <ul className="service-list">
                  <li>Alvará de Localização e Funcionamento</li>
                  <li>Alvará Sanitário</li>
                  <li>Alvará / Licença para Publicidade</li>
                  <li>Licenciamento Ambiental Municipal e Estadual</li>
                </ul>
              </div>

              <div className="service-card">
                <span className="icon material-symbols-outlined">eco</span>
                <h3>Regularização Ambiental</h3>
                <p>Soluções completas para manter sua empresa em dia com as normas ambientais.</p>
                 <ul className="service-list">
                  <li>Licenciamento e atualização de processos</li>
                  <li>Diagnósticos e estudos de impacto ambiental</li>
                  <li>Consultoria, compliance e auditoria interna</li>
                  <li>PGRSS (Resíduos de Serviços de Saúde)</li>
                  <li>Acompanhamento de condicionantes</li>
                </ul>
              </div>

              <div className="service-card">
                <span className="icon material-symbols-outlined">description</span>
                 <h3>Certidões e Documentações</h3>
                <p>Emitimos e regularizamos todos os documentos necessários para a operação da sua empresa.</p>
                 <ul className="service-list">
                  <li>Emissão de certidões (federais, estaduais, etc.)</li>
                  <li>Regularização de cadastros e registros</li>
                  <li>Representação técnica junto a órgãos públicos</li>
                </ul>
              </div>
              
               <div className="service-card">
                <span className="icon material-symbols-outlined">school</span>
                 <h3>Consultoria e Treinamentos</h3>
                <p>Capacitamos empresas e equipes para uma gestão eficiente e sustentável.</p>
                 <ul className="service-list">
                  <li>Treinamentos sobre legislação ambiental</li>
                  <li>Capacitação em regularização empresarial</li>
                  <li>Mentoria para empreendedores</li>
                  <li>Consultoria estratégica e administrativa</li>
                </ul>
              </div>

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
                    <a href="https://wa.me/5531982318463" target="_blank" rel="noopener noreferrer" className="contact-link">
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
                         <a href="https://wa.me/5531982318463" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
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