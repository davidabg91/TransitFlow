import{n as e}from"./rolldown-runtime-Bh1tDfsg.js";import{$ as t,A as n,B as r,E as i,F as a,M as o,Q as s,R as c,S as l,W as u,X as d,it as f,mt as p,nt as m,s as h,tt as g,u as _,v,w as y}from"./react-vendor-CUer8lI-.js";import{C as b,_ as x,c as S,g as C,i as w,m as T,o as E,s as D,u as O,v as k}from"./firebase-vendor-YPNYKjyN.js";import{t as A}from"./schedules-CRALYnA7.js";import{n as j,t as M}from"./routeMetadata-Bw2rTrwN.js";var N=``+new URL(`logo_main-DyW4-5Sn.png`,import.meta.url).href,P=e(p(),1),F=m(),I=({courseId:e})=>{let[r,i]=(0,P.useState)(!1),[a,o]=(0,P.useState)(!1),[c,l]=(0,P.useState)(null),[d,f]=(0,P.useState)(!1);return(0,P.useEffect)(()=>{(async()=>{localStorage.getItem(`fcm_token_${e}`)&&i(!0)})()},[e]),(0,F.jsxs)(`div`,{style:{background:`rgba(255,255,255,0.03)`,borderRadius:`20px`,padding:`1.5rem`,border:`1px solid rgba(255,255,255,0.08)`,marginTop:`1.5rem`,display:`flex`,flexDirection:`column`,gap:`1rem`,animation:`fadeIn 0.5s ease`},children:[(0,F.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.75rem`},children:[(0,F.jsx)(`div`,{style:{width:`40px`,height:`40px`,borderRadius:`12px`,background:r?`rgba(0, 200, 83, 0.1)`:`rgba(255, 82, 82, 0.1)`,display:`flex`,alignItems:`center`,justifyContent:`center`,color:r?`#00c853`:`#ff5252`},children:(0,F.jsx)(s,{size:20})}),(0,F.jsxs)(`div`,{style:{flex:1},children:[(0,F.jsx)(`h4`,{style:{margin:0,fontSize:`1rem`,fontWeight:800},children:r?`Абониран сте за известия`:`Абонирайте се за известия`}),(0,F.jsxs)(`p`,{style:{margin:0,fontSize:`0.8rem`,color:`rgba(255,255,255,0.5)`,lineHeight:1.4},children:[`Ще получавате съобщения за промени в разписанието за курс `,(0,F.jsx)(`strong`,{style:{color:`#ff5252`},children:e}),`.`]})]})]}),c&&(0,F.jsx)(`div`,{style:{fontSize:`0.8rem`,color:`#ff5252`,padding:`0.75rem`,background:`rgba(255, 82, 82, 0.1)`,borderRadius:`10px`,border:`1px solid rgba(255, 82, 82, 0.2)`},children:c}),(0,F.jsx)(`button`,{onClick:r?async()=>{o(!0);try{let t=localStorage.getItem(`fcm_token_${e}`);if(t){let n=(await O(k(w(E,`push_subscriptions`),b(`token`,`==`,t),b(`courseId`,`==`,e)))).docs.map(e=>D(S(E,`push_subscriptions`,e.id)));await Promise.all(n),localStorage.removeItem(`fcm_token_${e}`),i(!1)}}catch(e){console.error(`Unsubscribe error:`,e);let t=e instanceof Error?e.message:`Неизвестна грешка`;l(`Грешка при отказ: `+t)}finally{o(!1)}}:async()=>{},disabled:a,style:{padding:`0.9rem`,borderRadius:`12px`,background:r?`rgba(255,255,255,0.05)`:`#ff5252`,color:`#fff`,border:r?`1px solid rgba(255,255,255,0.1)`:`none`,fontWeight:700,fontSize:`0.9rem`,cursor:a?`not-allowed`:`pointer`,display:`flex`,alignItems:`center`,justifyContent:`center`,gap:`0.75rem`,transition:`all 0.3s ease`,boxShadow:r?`none`:`0 8px 20px rgba(255, 82, 82, 0.2)`},children:a?(0,F.jsx)(n,{size:18,className:`animate-spin`}):r?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(t,{size:18}),` ОТМЕНИ АБОНАМЕНТ`]}):d?(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(u,{size:18}),` УСПЕШНО АБОНИРАН!`]}):(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(s,{size:18}),` АБОНИРАЙ СЕ СЕГА`]})})]})},L=()=>{let[e,t]=(0,P.useState)(``),[n,u]=(0,P.useState)(new Date),[p,m]=(0,P.useState)(null),[b,S]=(0,P.useState)([]);(0,P.useEffect)(()=>{let e=C(k(w(E,`push_notifications`),x(`timestamp`,`desc`),T(3)),e=>{let t=e.docs.map(e=>({id:e.id,...e.data()}));S(t)});return()=>e()},[]),(0,P.useEffect)(()=>{let e=setInterval(()=>u(new Date),1e4);return()=>clearInterval(e)},[]);let D=[`Долни Дъбник - Садовец`,`Долна Митрополия - Славовица`,`Долна Митрополия - Тръстеник`],O=Object.keys(M).filter(e=>!D.includes(e)).sort((e,t)=>e.localeCompare(t,`bg`)).filter(t=>t.toLowerCase().includes(e.toLowerCase())),L=(e,t)=>{let r=A[e];if(!r)return null;let i=n.getDay(),a=n.getHours()*60+n.getMinutes(),o=e=>e===6&&r.saturday?r.saturday[t]:e===0&&r.sunday?r.sunday[t]:r[t],s=o(i);if(!s||s.length===0)return null;let c=s.map(e=>{let t=e.replace(`*`,``).split(`:`);return parseInt(t[0])*60+parseInt(t[1])}).filter(e=>e>a).sort((e,t)=>e-t)[0];if(c!==void 0)return c-a;let l=o((i+1)%7);if(!l||l.length===0)return null;let u=l.map(e=>{let t=e.replace(`*`,``).split(`:`);return parseInt(t[0])*60+parseInt(t[1])}).sort((e,t)=>e-t)[0];return 1440-a+u},R=e=>e===null?`--`:e>60?`${Math.floor(e/60)}ч ${e%60}м`:`${e} мин`,z=n.getDay(),B=z===6,V=z===0,H=z>=1&&z<=5,U=e=>{if(!e||e.length===0)return null;let t=n.getHours()*60+n.getMinutes(),r=e.map(e=>{let t=e.replace(`*`,``).split(`:`),n=parseInt(t[0]),r=parseInt(t[1]);return{t:e.replace(`*`,``),mins:n*60+r}}).filter(e=>e.mins>t).sort((e,t)=>e.mins-t.mins);return r.length>0?r[0].t:null};return(0,F.jsxs)(`div`,{style:{minHeight:`100vh`,background:`var(--bg-color)`,color:`#fff`,fontFamily:`var(--font-family)`,paddingBottom:`5rem`},children:[(0,F.jsx)(`style`,{children:`
                .hero-bg {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 600px;
                    background: radial-gradient(circle at 50% -20%, rgba(0,173,181,0.15) 0%, transparent 70%);
                    z-index: 0;
                }
                .search-container:focus-within {
                    border-color: var(--primary-color) !important;
                    box-shadow: 0 0 20px rgba(0,173,181,0.2);
                }
                .route-card {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid rgba(255,255,255,0.05) !important;
                }
                .route-card:hover {
                    transform: translateY(-5px);
                    border-color: rgba(0,173,181,0.3) !important;
                    background: rgba(255,255,255,0.03) !important;
                }
                .stop-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: var(--primary-color);
                    position: relative;
                }
                .stop-line {
                    height: 2px; flex: 1;
                    background: rgba(255,255,255,0.1);
                    margin: 0 4px;
                }
                .schedule-tag {
                    padding: 0.3rem 0.6rem;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .next-bus-tag-active {
                    background: rgba(46, 204, 113, 0.2) !important;
                    color: #2ecc71 !important;
                    border-color: #2ecc71 !important;
                    box-shadow: 0 0 15px rgba(46, 204, 113, 0.3);
                    animation: pulse-green 2s infinite ease-in-out;
                    z-index: 10;
                }
                @keyframes pulse-green {
                    0% { box-shadow: 0 0 5px rgba(46, 204, 113, 0.3); transform: scale(1); }
                    50% { box-shadow: 0 0 20px rgba(46, 204, 113, 0.6); transform: scale(1.05); }
                    100% { box-shadow: 0 0 5px rgba(46, 204, 113, 0.3); transform: scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .selection-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 0.8rem 1.2rem;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 1rem;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: left;
                }
                .selection-card:hover {
                    background: rgba(0, 173, 181, 0.1);
                    border-color: var(--primary-color);
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,173,181,0.15);
                }
                .selection-icon {
                    width: 36px;
                    height: 36px;
                    min-width: 36px;
                    background: rgba(0, 173, 181, 0.1);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-color);
                    transition: 0.3s;
                }
                .selection-card h3 {
                    margin: 0;
                }
                .selection-card:hover .selection-icon {
                    background: var(--primary-color);
                    color: #fff;
                    transform: scale(1.1);
                }

                .info-container {
                    background: linear-gradient(135deg, rgba(0,173,181,0.1), rgba(0,173,181,0.05));
                    border-radius: 32px;
                    padding: 3rem;
                    border: 1px solid rgba(0,173,181,0.1);
                    display: flex;
                    flex-wrap: wrap;
                    gap: 3rem;
                    align-items: flex-start;
                    transition: 0.3s;
                }

                .working-hours-card {
                    padding: 2.5rem;
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.02);
                    text-align: center;
                    backdrop-filter: blur(10px);
                }

                @media (max-width: 768px) {
                    .info-container {
                        padding: 1.5rem;
                        gap: 2rem;
                        border-radius: 24px;
                    }
                    .working-hours-card {
                        padding: 1.5rem;
                        border-radius: 20px;
                    }
                    .route-grid {
                        gap: 0.5rem !important;
                    }
                    .selection-card {
                        padding: 0.6rem 0.5rem !important;
                        border-radius: 12px !important;
                        gap: 0.4rem !important;
                        min-width: 0 !important;
                    }
                    .selection-icon {
                        display: none !important;
                    }
                    .selection-card h3 {
                        font-size: 0.8rem !important;
                        text-align: center;
                        width: 100%;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                    .selection-card div > div {
                        display: none !important;
                    }
                }
                .route-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr));
                    gap: 1rem;
                }
                @media (max-width: 480px) {
                    .route-grid.selection-grid {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 0.4rem !important;
                    }
                }
                
                @media (max-width: 768px) {
                    .main-content {
                        padding: 2rem 0.6rem !important;
                    }
                    .mobile-info-section {
                        padding: 0 !important;
                    }
                    .info-container {
                        padding: 1.2rem 0.8rem !important;
                        flex-direction: column !important;
                        gap: 1.5rem !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        border-radius: 20px !important;
                        margin: 0 !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                    }
                    .info-container > div {
                        width: 100% !important;
                        min-width: 0 !important;
                    }
                    .info-container h2 {
                        font-size: 1.5rem !important;
                    }
                    .info-container p {
                        font-size: 0.9rem !important;
                        line-height: 1.5 !important;
                        padding: 0 !important;
                    }
                    .info-container .info-list-item {
                        gap: 0.8rem !important;
                    }
                    .info-container .info-list-item div:last-child {
                        flex: 1 !important;
                        min-width: 0 !important;
                    }
                    .info-container .info-list-item div:last-child div {
                        font-size: 0.85rem !important;
                        white-space: normal !important;
                    }
                    .info-container .info-list-item div:last-child div:last-child {
                        font-size: 0.75rem !important;
                    }
                    .footer-content {
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        gap: 2rem !important;
                    }
                    .footer-brand {
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .footer-links {
                        width: 100% !important;
                        gap: 0.8rem !important;
                        flex-direction: row !important;
                        justify-content: center !important;
                    }
                    .footer-card .signal-btn {
                        padding: 0.5rem 0.4rem !important;
                        font-size: 0.7rem !important;
                        width: 100% !important;
                        justify-content: center !important;
                        gap: 0.3rem !important;
                    }
                    .footer-card {
                        min-width: 0 !important;
                        flex: 1 !important;
                        padding: 1rem 0.3rem !important;
                    }
                    .footer-card h5 {
                        font-size: 0.65rem !important;
                    }
                    .footer-card p {
                        font-size: 0.7rem !important;
                    }
                    .footer-card img {
                        height: 60px !important;
                    }
                    .footer-card .contact-item {
                        font-size: 0.7rem !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        max-width: 100% !important;
                        display: block !important;
                    }
                    .footer-card a[href^="tel"] {
                        display: flex !important;
                        justify-content: center !important;
                    }
                    .footer-card .contact-item .lucide {
                        display: none !important;
                    }
                    .footer-card .signal-btn {
                        padding: 0.4rem 0.3rem !important;
                        font-size: 0.65rem !important;
                        width: 100% !important;
                        justify-content: center !important;
                        gap: 0.3rem !important;
                    }
                    .footer-card a[to="/signal"] svg,
                    .footer-card a[href="/signal"] svg {
                        width: 10px !important;
                        height: 10px !important;
                    }
                }
                @media (min-width: 481px) and (max-width: 768px) {
                    .route-grid.selection-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                .main-content {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    margin: 0 auto;
                    padding: 4rem 1.5rem;
                }
            `}),(0,F.jsx)(`div`,{className:`hero-bg`}),(0,F.jsxs)(`main`,{className:`main-content`,children:[(0,F.jsxs)(`div`,{style:{textAlign:`center`,marginBottom:`4rem`},children:[(0,F.jsxs)(`h1`,{style:{fontSize:`clamp(2rem, 8vw, 4.5rem)`,fontWeight:900,marginBottom:`1rem`,letterSpacing:`-2px`,lineHeight:1.1},children:[`Вашите Пътувания, `,(0,F.jsx)(`br`,{}),`По-Умни с `,(0,F.jsx)(`span`,{style:{color:`#ff5252`},children:`DARY Commerce`})]}),(0,F.jsx)(`p`,{style:{fontSize:`clamp(1.1rem, 4vw, 1.4rem)`,color:`rgba(255,255,255,0.7)`,maxWidth:`800px`,margin:`0 auto 2rem`,padding:`0 1rem`,fontWeight:600},children:`Пълни графици и информация за всички автобусни линии в град Плевен и региона`}),(0,F.jsxs)(`div`,{className:`search-container`,style:{maxWidth:`600px`,margin:`0 auto`,background:`rgba(255,255,255,0.03)`,border:`1px solid rgba(255,255,255,0.1)`,borderRadius:`20px`,padding:`0.5rem 1rem`,display:`flex`,alignItems:`center`,gap:`1rem`,backdropFilter:`blur(10px)`,transition:`0.3s`},children:[(0,F.jsx)(v,{size:24,color:`rgba(255,255,255,0.3)`}),(0,F.jsx)(`input`,{placeholder:`Намери своята линия`,value:e,onChange:e=>t(e.target.value),style:{width:`100%`,background:`none`,border:`none`,color:`#fff`,fontSize:`1.1rem`,padding:`0.8rem 0`,outline:`none`}})]})]}),b.length>0&&!p&&(0,F.jsxs)(`div`,{style:{maxWidth:`800px`,margin:`0 auto 4rem`,animation:`fadeIn 0.6s ease-out`},children:[(0,F.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.8rem`,marginBottom:`1.5rem`,padding:`0 1rem`},children:[(0,F.jsx)(`div`,{style:{width:`32px`,height:`32px`,borderRadius:`8px`,background:`rgba(255, 82, 82, 0.1)`,display:`flex`,alignItems:`center`,justifyContent:`center`,color:`#ff5252`},children:(0,F.jsx)(s,{size:18})}),(0,F.jsx)(`h2`,{style:{fontSize:`1.2rem`,fontWeight:800,margin:0,letterSpacing:`1px`},children:`ВАЖНИ ИЗВЕСТИЯ`})]}),(0,F.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1rem`},children:b.map(e=>(0,F.jsxs)(`div`,{style:{background:`rgba(255, 255, 255, 0.02)`,border:`1px solid rgba(255, 255, 255, 0.05)`,borderRadius:`24px`,padding:`1.5rem`,backdropFilter:`blur(10px)`,position:`relative`,overflow:`hidden`},children:[(0,F.jsx)(`div`,{style:{position:`absolute`,top:0,left:0,width:`4px`,height:`100%`,background:`#ff5252`}}),(0,F.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`flex-start`,marginBottom:`0.8rem`},children:[(0,F.jsx)(`h3`,{style:{margin:0,fontSize:`1.1rem`,fontWeight:800,color:`#ff5252`},children:e.title}),(0,F.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`0.4rem`,fontSize:`0.75rem`,color:`rgba(255,255,255,0.4)`,fontWeight:600},children:[(0,F.jsx)(d,{size:12}),e.timestamp?new Date(e.timestamp).toLocaleDateString(`bg-BG`):``]})]}),(0,F.jsx)(`p`,{style:{margin:0,fontSize:`0.95rem`,lineHeight:1.6,color:`rgba(255,255,255,0.8)`,whiteSpace:`pre-wrap`},children:e.body}),e.courseId&&e.courseId!==`all`&&(0,F.jsxs)(`div`,{style:{marginTop:`1rem`,display:`inline-flex`,padding:`0.3rem 0.8rem`,background:`rgba(255,255,255,0.05)`,borderRadius:`8px`,fontSize:`0.7rem`,fontWeight:700,color:`rgba(255,255,255,0.5)`,textTransform:`uppercase`,letterSpacing:`0.5px`},children:[`Линия: `,e.courseId]})]},e.id))})]}),p&&(0,F.jsxs)(`button`,{onClick:()=>m(null),style:{display:`flex`,alignItems:`center`,gap:`0.6rem`,background:`rgba(255,255,255,0.05)`,border:`1px solid rgba(255,255,255,0.1)`,padding:`0.8rem 1.5rem`,borderRadius:`14px`,color:`rgba(255,255,255,0.6)`,fontWeight:700,marginBottom:`2rem`,cursor:`pointer`,transition:`0.3s`},onMouseEnter:e=>{e.currentTarget.style.background=`rgba(255,255,255,0.1)`,e.currentTarget.style.color=`#fff`},onMouseLeave:e=>{e.currentTarget.style.background=`rgba(255,255,255,0.05)`,e.currentTarget.style.color=`rgba(255,255,255,0.6)`},children:[(0,F.jsx)(g,{size:18,style:{transform:`rotate(180deg)`}}),` Всички Дестинации`]}),p?(0,F.jsx)(`div`,{className:`route-grid`,style:{gridTemplateColumns:`1fr`},children:O.filter(e=>e===p).map(e=>{let t=L(e,`fromPleven`),n=L(e,`fromDestination`),i=M[e],a=A[e],s=`ПЛЕВЕН`,c=e.toUpperCase(),l={Божурица:`РИБЕН`,Победа:`РИБЕН`,Биволаре:`РИБЕН`,Градина:`БЪРКАЧ`,Крушовица:`САДОВЕЦ`,Ореховица:`БАЙКАЛ`,Брегаре:`БАЙКАЛ`,Крушовене:`БАЙКАЛ`};if(l[e])c=l[e];else if(e.includes(` - `)){let t=e.split(` - `);s=t[0].toUpperCase(),c=t[1].toUpperCase()}return(0,F.jsxs)(`div`,{className:`route-card`,style:{width:`100%`,maxWidth:`1200px`,margin:`0 auto`,background:`rgba(255,255,255,0.02)`,borderRadius:`24px`,padding:`clamp(1.2rem, 5vw, 2.5rem)`,display:`flex`,flexDirection:`column`,gap:`2rem`},children:[(0,F.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`flex-start`},children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`div`,{style:{fontSize:`0.75rem`,color:`var(--primary-color)`,fontWeight:800,textTransform:`uppercase`,letterSpacing:`2px`,marginBottom:`0.3rem`},children:`ЛИНИЯ`}),(0,F.jsx)(`h3`,{style:{fontSize:`1.6rem`,fontWeight:900},children:e}),i?.description&&(0,F.jsx)(`div`,{style:{fontSize:`0.75rem`,color:`var(--accent-color)`,fontWeight:600,maxWidth:`200px`,lineHeight:1.3,marginTop:`0.4rem`},children:i.description})]}),(0,F.jsxs)(`div`,{style:{textAlign:`right`,display:`flex`,flexDirection:`column`,gap:`0.5rem`},children:[(0,F.jsxs)(`div`,{children:[(0,F.jsxs)(`div`,{style:{fontSize:`0.65rem`,color:`rgba(255,255,255,0.4)`,fontWeight:800},children:[`ОТ `,s,` СЛЕД:`]}),(0,F.jsxs)(`div`,{style:{fontSize:`1rem`,fontWeight:900,color:t&&t<=15?`var(--success-color)`:`#fff`,display:`flex`,alignItems:`center`,gap:`0.4rem`,justifyContent:`flex-end`},children:[(0,F.jsx)(r,{size:16}),` `,R(t)]})]}),(0,F.jsxs)(`div`,{children:[(0,F.jsxs)(`div`,{style:{fontSize:`0.65rem`,color:`rgba(255,255,255,0.4)`,fontWeight:800},children:[`ОТ `,c,` СЛЕД:`]}),(0,F.jsxs)(`div`,{style:{fontSize:`1rem`,fontWeight:900,color:n&&n<=15?`var(--success-color)`:`#fff`,display:`flex`,alignItems:`center`,gap:`0.4rem`,justifyContent:`flex-end`},children:[(0,F.jsx)(r,{size:16}),` `,R(n)]})]})]})]}),i&&(0,F.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`2.5rem`,padding:`0.8rem 0 1.2rem`},children:(0,F.jsx)(`div`,{style:{background:`rgba(0,173,181,0.03)`,padding:`4.5rem 1rem 4.5rem`,borderRadius:`16px`,border:`1px solid rgba(0,173,181,0.1)`},children:(0,F.jsx)(`div`,{style:{display:`flex`,alignItems:`center`,padding:`0 0.5rem`,position:`relative`},children:i.stops.map((e,t)=>(0,F.jsxs)(P.Fragment,{children:[(0,F.jsxs)(`div`,{className:`stop-dot`,title:e,style:{display:`flex`,flexDirection:`column`,alignItems:`center`,zIndex:2},children:[(0,F.jsx)(`div`,{style:{width:`10px`,height:`10px`,background:`var(--primary-color)`,borderRadius:`50%`,border:`2px solid rgba(255,255,255,0.1)`}}),(0,F.jsx)(`span`,{style:{position:`absolute`,top:t%2==0?`22px`:`auto`,bottom:t%2==0?`auto`:`22px`,fontSize:`clamp(0.6rem, 1.25vw, 0.85rem)`,whiteSpace:`nowrap`,opacity:.9,fontWeight:800,textAlign:`center`,color:t===0||t===i.stops.length-1?`var(--primary-color)`:`#fff`},children:j(e)})]}),t<i.stops.length-1&&(0,F.jsxs)(`div`,{style:{flex:1,display:`flex`,alignItems:`center`,position:`relative`},children:[(0,F.jsx)(`div`,{className:`stop-line`,style:{background:`linear-gradient(90deg, var(--primary-color), rgba(255,255,255,0.1))`,height:`2px`,width:`100%`}}),(0,F.jsx)(g,{size:10,color:`var(--primary-color)`,style:{position:`absolute`,left:`50%`,transform:`translateX(-50%)`,opacity:.5}})]})]},t))})})}),(0,F.jsxs)(`div`,{style:{display:`flex`,gap:`1rem`,background:`rgba(255,255,255,0.03)`,padding:`1rem`,borderRadius:`16px`},children:[(0,F.jsxs)(`div`,{style:{flex:1,textAlign:`center`},children:[(0,F.jsx)(`div`,{style:{fontSize:`0.7rem`,color:`rgba(255,255,255,0.4)`,fontWeight:700},children:`БИЛЕТ`}),(0,F.jsx)(`div`,{style:{fontWeight:800},children:i?.priceSingle||`---`})]}),(0,F.jsx)(`div`,{style:{width:`1px`,background:`rgba(255,255,255,0.1)`}}),(0,F.jsxs)(`div`,{style:{flex:1,textAlign:`center`},children:[(0,F.jsxs)(`div`,{style:{fontSize:`0.7rem`,color:`rgba(255,255,255,0.4)`,fontWeight:700,display:`flex`,alignItems:`center`,gap:`0.4rem`,justifyContent:`center`},children:[`КАРТА (Месец)`,(0,F.jsx)(`button`,{onClick:()=>document.getElementById(`info-section`)?.scrollIntoView({behavior:`smooth`}),style:{background:`none`,border:`none`,padding:0,display:`flex`,alignItems:`center`,cursor:`pointer`,color:`var(--primary-color)`,opacity:.8,transition:`opacity 0.2s`},onMouseEnter:e=>e.currentTarget.style.opacity=`1`,onMouseLeave:e=>e.currentTarget.style.opacity=`0.8`,title:`Повече информация за карти`,children:(0,F.jsx)(o,{size:18})})]}),(0,F.jsx)(`div`,{style:{fontWeight:800},children:i?.priceCard||`---`})]})]}),(0,F.jsxs)(`div`,{style:{padding:`0.8rem 1rem`,background:`rgba(0,173,181,0.05)`,borderRadius:`12px`,border:`1px solid rgba(0,173,181,0.2)`,fontSize:`0.8rem`,color:`rgba(255,255,255,0.8)`,display:`flex`,alignItems:`center`,gap:`0.8rem`,marginTop:`-0.5rem`},children:[(0,F.jsx)(`div`,{style:{width:`24px`,height:`24px`,borderRadius:`50%`,background:`rgba(0,173,181,0.1)`,display:`flex`,alignItems:`center`,justifyContent:`center`,color:`var(--primary-color)`,flexShrink:0},children:(0,F.jsx)(o,{size:14})}),(0,F.jsxs)(`p`,{style:{margin:0,lineHeight:1.4,fontWeight:500},children:[`Цените за ученици и пенсионери са `,(0,F.jsx)(`span`,{style:{color:`var(--primary-color)`,fontWeight:700},children:`-50%`}),` от тези цени, а за хора с увреждания над 70.99% са с `,(0,F.jsx)(`span`,{style:{color:`var(--primary-color)`,fontWeight:700},children:`-25%`}),`.`]})]}),(0,F.jsxs)(`div`,{style:{padding:`1.2rem`,background:`rgba(255,255,255,0.02)`,borderRadius:`16px`,animation:`fadeIn 0.3s ease-out`,display:`flex`,flexDirection:`column`,gap:`1.5rem`},children:[(0,F.jsx)(`div`,{style:{marginBottom:`-0.5rem`,paddingBottom:`0.8rem`,borderBottom:`1px solid rgba(255,255,255,0.05)`,display:`flex`,flexDirection:`column`,alignItems:`center`},children:(0,F.jsxs)(`h4`,{style:{fontSize:`0.85rem`,fontWeight:900,color:`var(--primary-color)`,textTransform:`uppercase`,letterSpacing:`1px`,display:`flex`,alignItems:`center`,gap:`0.6rem`},children:[(0,F.jsx)(r,{size:16}),` Пълно разписание на курса`]})}),[{id:`sunday`,condition:!!a.sunday,isCurrent:V,label:`НЕДЕЛЯ`,color:`#ff5252`,times:a.sunday},{id:`saturday`,condition:!!a.saturday,isCurrent:B,label:`СЪБОТА`,color:`#ff9800`,times:a.saturday},{id:`workdays`,condition:!0,isCurrent:H,label:`ДЕЛНИК`,color:`var(--primary-color)`,times:{fromPleven:a.fromPleven,fromDestination:a.fromDestination}}].filter(e=>e.condition).sort((e,t)=>e.isCurrent===t.isCurrent?0:e.isCurrent?-1:1).map(e=>(0,F.jsxs)(`div`,{style:{marginTop:`0.5rem`,padding:`1rem`,background:e.isCurrent?`rgba(255,255,255,0.03)`:`transparent`,borderRadius:`12px`,border:e.isCurrent?`1px solid ${e.color}44`:`1px solid transparent`},children:[(0,F.jsx)(`div`,{style:{marginBottom:`1rem`,display:`flex`,flexDirection:`column`,alignItems:`flex-start`},children:(0,F.jsxs)(`div`,{style:{fontSize:`0.75rem`,fontWeight:900,color:e.color,textTransform:`uppercase`,letterSpacing:`1px`,display:`flex`,alignItems:`center`,gap:`0.6rem`},children:[e.label,` `,e.isCurrent&&(0,F.jsx)(`span`,{style:{fontSize:`0.6rem`,background:e.color,color:`#000`,padding:`1px 6px`,borderRadius:`4px`,marginLeft:`5px`},children:`ДНЕС`})]})}),(0,F.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(130px, 1fr))`,gap:`1rem`},children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`div`,{style:{fontSize:`0.65rem`,color:`rgba(255,255,255,0.4)`,fontWeight:800,marginBottom:`0.5rem`},children:`ОТ ПЛЕВЕН`}),(0,F.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:`0.4rem`},children:e.times.fromPleven.map(t=>{let n=t.includes(`*`),r=t.replace(`*`,``);return(0,F.jsxs)(`span`,{className:`schedule-tag ${e.isCurrent&&r===U(e.times.fromPleven)?`next-bus-tag-active`:``}`,style:{position:`relative`},children:[n&&(0,F.jsx)(`span`,{style:{position:`absolute`,top:`-10px`,left:`50%`,transform:`translateX(-50%)`,background:`#ff5252`,color:`#fff`,fontSize:`0.45rem`,fontWeight:900,padding:`1px 4px`,borderRadius:`4px`,zIndex:5,boxShadow:`0 2px 4px rgba(0,0,0,0.3)`,border:`1px solid rgba(255,255,255,0.2)`},children:`НОВО`}),r]},t)})})]}),(0,F.jsxs)(`div`,{children:[(0,F.jsxs)(`div`,{style:{fontSize:`0.65rem`,color:`rgba(255,255,255,0.4)`,fontWeight:800,marginBottom:`0.5rem`},children:[`ОТ `,c]}),(0,F.jsx)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:`0.4rem`},children:e.times.fromDestination.map(t=>{let n=t.includes(`*`),r=t.replace(`*`,``);return(0,F.jsxs)(`span`,{className:`schedule-tag ${e.isCurrent&&r===U(e.times.fromDestination)?`next-bus-tag-active`:``}`,style:{position:`relative`},children:[n&&(0,F.jsx)(`span`,{style:{position:`absolute`,top:`-10px`,left:`50%`,transform:`translateX(-50%)`,background:`#ff5252`,color:`#fff`,fontSize:`0.45rem`,fontWeight:900,padding:`1px 4px`,borderRadius:`4px`,zIndex:5,boxShadow:`0 2px 4px rgba(0,0,0,0.3)`,border:`1px solid rgba(255,255,255,0.2)`},children:`НОВО`}),r]},t)})})]})]})]},e.id)),(0,F.jsx)(I,{courseId:e}),l[e]&&(0,F.jsxs)(`div`,{style:{marginTop:`1rem`,fontSize:`0.7rem`,color:`rgba(255,255,255,0.4)`,fontWeight:600,fontStyle:`italic`,borderTop:`1px solid rgba(255,255,255,0.05)`,paddingTop:`0.8rem`},children:[`* Посочените часове са за преминаването на автобуса през началната точка на линията (`,c,`).`]})]})]},e)})}):(0,F.jsxs)(F.Fragment,{children:[(0,F.jsxs)(`div`,{style:{marginBottom:`3rem`,textAlign:`center`,display:`flex`,flexDirection:`column`,alignItems:`center`,gap:`1rem`,animation:`fadeIn 0.6s ease-out`},children:[(0,F.jsx)(`h2`,{style:{fontSize:`clamp(2rem, 5vw, 2.8rem)`,fontWeight:950,marginBottom:`0.2rem`,letterSpacing:`-1.5px`,background:`linear-gradient(to bottom, #fff 30%, rgba(255,255,255,0.7) 100%)`,WebkitBackgroundClip:`text`,WebkitTextFillColor:`transparent`,lineHeight:1},children:`Актуални Линии`}),(0,F.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`center`,gap:`0.8rem`,color:`rgba(255,255,255,0.4)`,fontSize:`0.75rem`,fontWeight:800,textTransform:`uppercase`,letterSpacing:`2px`},children:[(0,F.jsx)(`span`,{style:{width:`30px`,height:`1.5px`,background:`linear-gradient(90deg, transparent, rgba(0, 173, 181, 0.3))`}}),`към `,new Date().toLocaleDateString(`bg-BG`,{day:`2-digit`,month:`2-digit`,year:`numeric`}),(0,F.jsx)(`span`,{style:{width:`30px`,height:`1.5px`,background:`linear-gradient(90deg, rgba(0, 173, 181, 0.3), transparent)`}})]})]}),(0,F.jsx)(`div`,{className:`route-grid selection-grid`,children:O.map(e=>(0,F.jsxs)(`div`,{className:`selection-card`,onClick:()=>m(e),children:[(0,F.jsx)(`div`,{className:`selection-icon`,children:(0,F.jsx)(i,{size:18})}),(0,F.jsxs)(`div`,{style:{overflow:`hidden`,width:`100%`},children:[(0,F.jsx)(`h3`,{style:{fontSize:`1rem`,fontWeight:800,marginBottom:`0.1rem`,whiteSpace:`nowrap`,overflow:`hidden`,textOverflow:`ellipsis`},children:e}),(0,F.jsx)(`div`,{style:{fontSize:`0.65rem`,color:`rgba(255,255,255,0.4)`,fontWeight:700,textTransform:`uppercase`,letterSpacing:`0.5px`},children:`Преглед`})]})]},e))})]}),(0,F.jsx)(`section`,{id:`info-section`,className:`mobile-info-section`,style:{marginTop:`clamp(3rem, 10vw, 6rem)`,padding:`0 1rem`,overflowX:`hidden`},children:(0,F.jsxs)(`div`,{className:`info-container`,children:[(0,F.jsxs)(`div`,{style:{flex:`1`,width:`100%`,minWidth:0},children:[(0,F.jsx)(`div`,{style:{display:`inline-flex`,padding:`0.6rem 1.2rem`,background:`rgba(0,173,181,0.2)`,borderRadius:`100px`,fontSize:`0.75rem`,fontWeight:900,color:`var(--primary-color)`,marginBottom:`1.5rem`,letterSpacing:`2px`},children:`ВАЖНА ИНФОРМАЦИЯ`}),(0,F.jsx)(`h2`,{style:{fontSize:`clamp(1.75rem, 5vw, 2.5rem)`,fontWeight:900,marginBottom:`1.2rem`,lineHeight:1.2},children:`Как да извадите абонаментна карта?`}),(0,F.jsx)(`p`,{style:{fontSize:`clamp(1rem, 3.5vw, 1.1rem)`,color:`rgba(255,255,255,0.6)`,lineHeight:1.6,marginBottom:`2rem`},children:`Абонаментните карти за всички линии се издават на нашето специализирано гише. Процесът отнема по-малко от 5 минути и картата е готова веднага. Билети за пътуване се продават както на автогарата, така и от шофьора на място.`}),(0,F.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1.2rem`},children:[(0,F.jsxs)(`a`,{href:`https://share.google/ElVTTGsi6ivVOx7PW`,className:`info-list-item`,target:`_blank`,rel:`noopener noreferrer`,style:{display:`flex`,alignItems:`center`,gap:`1rem`,textDecoration:`none`,color:`inherit`,transition:`transform 0.2s`},onMouseEnter:e=>e.currentTarget.style.transform=`translateX(5px)`,onMouseLeave:e=>e.currentTarget.style.transform=`translateX(0)`,children:[(0,F.jsx)(`div`,{style:{width:`40px`,height:`40px`,minWidth:`40px`,background:`rgba(0,173,181,0.1)`,borderRadius:`50%`,display:`flex`,alignItems:`center`,justifyContent:`center`,border:`1px solid rgba(0,173,181,0.3)`},children:(0,F.jsx)(i,{size:20,color:`var(--primary-color)`})}),(0,F.jsxs)(`div`,{style:{flex:1},children:[(0,F.jsxs)(`div`,{style:{fontWeight:800,color:`var(--primary-color)`,display:`flex`,alignItems:`center`,gap:`0.5rem`,flexWrap:`wrap`},children:[`Автогара Плевен `,(0,F.jsx)(a,{size:12})]}),(0,F.jsx)(`div`,{style:{fontSize:`0.9rem`,color:`rgba(255,255,255,0.4)`},children:`Гише DARY COMMERCE`})]})]}),(0,F.jsxs)(`div`,{className:`info-list-item`,style:{display:`flex`,alignItems:`center`,gap:`1rem`},children:[(0,F.jsx)(`div`,{style:{width:`40px`,height:`40px`,minWidth:`40px`,background:`rgba(255,255,255,0.1)`,borderRadius:`50%`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:(0,F.jsx)(c,{size:20,color:`var(--primary-color)`})}),(0,F.jsxs)(`div`,{style:{flex:1},children:[(0,F.jsx)(`div`,{style:{fontWeight:800},children:`Електронна Карта`}),(0,F.jsx)(`div`,{style:{fontSize:`0.9rem`,color:`rgba(255,255,255,0.4)`},children:`Валидна за всички линии`})]})]}),(0,F.jsxs)(`div`,{className:`info-list-item`,style:{display:`flex`,alignItems:`center`,gap:`1rem`},children:[(0,F.jsx)(`div`,{style:{width:`40px`,height:`40px`,minWidth:`40px`,background:`rgba(255,255,255,0.05)`,borderRadius:`50%`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:(0,F.jsx)(_,{size:20,color:`var(--primary-color)`})}),(0,F.jsxs)(`div`,{style:{flex:1},children:[(0,F.jsx)(`div`,{style:{fontWeight:800},children:`Еднократен Билет`}),(0,F.jsx)(`div`,{style:{fontSize:`0.9rem`,color:`rgba(255,255,255,0.4)`},children:`От гише или шофьор`})]})]})]})]}),(0,F.jsx)(`div`,{style:{flex:`1`,width:`100%`,position:`relative`},children:(0,F.jsxs)(`div`,{className:`working-hours-card glass`,children:[(0,F.jsx)(`h4`,{style:{marginBottom:`1.5rem`,fontWeight:900,color:`var(--primary-color)`},children:`Работно Време`}),(0,F.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,padding:`0.5rem 0`,borderBottom:`1px solid rgba(255,255,255,0.05)`},children:[(0,F.jsx)(`span`,{children:`Понеделник - Петък`}),(0,F.jsx)(`span`,{style:{fontWeight:800},children:`08:00 - 17:00`})]}),(0,F.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,padding:`0.8rem 0`,borderBottom:`1px solid rgba(255,255,255,0.05)`,color:`rgba(255,255,255,0.3)`},children:[(0,F.jsx)(`span`,{children:`Събота`}),(0,F.jsx)(`span`,{style:{fontWeight:800},children:`Почивен ден`})]}),(0,F.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,padding:`0.5rem 0`,color:`rgba(255,255,255,0.3)`},children:[(0,F.jsx)(`span`,{children:`Неделя`}),(0,F.jsx)(`span`,{style:{fontWeight:800},children:`Почивен ден`})]})]})})]})})]}),(0,F.jsxs)(`footer`,{style:{borderTop:`1px solid rgba(255,255,255,0.05)`,padding:`clamp(2rem, 8vw, 4rem) 1.5rem 2rem`,marginTop:`clamp(2rem, 8vw, 4rem)`},children:[(0,F.jsxs)(`div`,{className:`footer-content`,style:{maxWidth:`1200px`,margin:`0 auto`,display:`flex`,flexWrap:`wrap`,gap:`clamp(2rem, 5vw, 4rem)`,justifyContent:`space-between`},children:[(0,F.jsxs)(`div`,{className:`footer-brand`,style:{maxWidth:`300px`},children:[(0,F.jsx)(`div`,{style:{marginBottom:`1.2rem`},children:(0,F.jsx)(`h3`,{style:{fontSize:`1.5rem`,fontWeight:900,color:`#ff5252`,letterSpacing:`0.05em`},children:`DARY COMMERCE`})}),(0,F.jsx)(`p`,{style:{color:`rgba(255,255,255,0.4)`,lineHeight:1.6},children:`Вашият доверен партньор в пътническия транспорт в област Плевен. Сигурност, точност и комфорт.`})]}),(0,F.jsxs)(`div`,{className:`footer-links`,style:{display:`flex`,flexWrap:`wrap`,gap:`4rem`},children:[(0,F.jsxs)(`div`,{className:`footer-card`,style:{background:`rgba(255,255,255,0.03)`,backdropFilter:`blur(10px)`,padding:`1.5rem`,borderRadius:`24px`,border:`1px solid rgba(255,255,255,0.05)`,display:`flex`,flexDirection:`column`,alignItems:`center`,textAlign:`center`,minWidth:`220px`},children:[(0,F.jsx)(`h5`,{style:{marginBottom:`0.8rem`,fontWeight:900,fontSize:`0.75rem`,letterSpacing:`1px`,color:`rgba(255,255,255,0.6)`,textTransform:`uppercase`},children:`ПАРТНЬОРИ`}),(0,F.jsx)(`a`,{href:`https://darytravel.com/`,target:`_blank`,rel:`noopener noreferrer`,style:{display:`block`,transition:`transform 0.2s`,marginBottom:`0.5rem`},onMouseEnter:e=>e.currentTarget.style.transform=`scale(1.05)`,onMouseLeave:e=>e.currentTarget.style.transform=`scale(1)`,children:(0,F.jsx)(`img`,{src:N,alt:`TransitFlow Operator`,style:{height:`90px`,width:`auto`}})}),(0,F.jsx)(`p`,{style:{color:`rgba(255,255,255,0.3)`,fontSize:`0.8rem`,margin:0},children:`Екскурзии навсякъде по света`})]}),(0,F.jsxs)(`div`,{className:`footer-card`,style:{background:`rgba(255,255,255,0.03)`,backdropFilter:`blur(10px)`,padding:`1.5rem`,borderRadius:`24px`,border:`1px solid rgba(255,255,255,0.05)`,display:`flex`,flexDirection:`column`,alignItems:`center`,textAlign:`center`,minWidth:`220px`},children:[(0,F.jsx)(`h5`,{style:{marginBottom:`1.2rem`,fontWeight:900,fontSize:`0.75rem`,letterSpacing:`1px`,color:`rgba(255,255,255,0.6)`,textTransform:`uppercase`},children:`КОНТАКТИ`}),(0,F.jsxs)(`div`,{className:`footer-contact-list`,style:{display:`flex`,flexDirection:`column`,gap:`0.8rem`,color:`rgba(255,255,255,0.5)`,fontSize:`0.9rem`,alignItems:`center`},children:[(0,F.jsxs)(`a`,{href:`tel:0898481433`,className:`contact-item`,style:{display:`flex`,alignItems:`center`,gap:`0.5rem`,textDecoration:`none`,color:`inherit`},children:[(0,F.jsx)(l,{size:14}),` 0898481433`]}),(0,F.jsxs)(`div`,{className:`contact-item`,style:{display:`flex`,alignItems:`center`,gap:`0.5rem`},children:[(0,F.jsx)(y,{size:14}),` dary.commerce@gmail.com`]}),(0,F.jsxs)(f,{to:`/signal`,className:`signal-btn`,style:{marginTop:`0.5rem`,display:`flex`,alignItems:`center`,gap:`0.6rem`,textDecoration:`none`,color:`#fff`,background:`rgba(229,57,53,0.15)`,padding:`0.6rem 1.2rem`,borderRadius:`12px`,border:`1px solid rgba(229,57,53,0.3)`,fontWeight:700,fontSize:`0.85rem`,transition:`all 0.2s`},onMouseEnter:e=>{e.currentTarget.style.background=`rgba(229,57,53,0.25)`,e.currentTarget.style.transform=`translateY(-2px)`},onMouseLeave:e=>{e.currentTarget.style.background=`rgba(229,57,53,0.15)`,e.currentTarget.style.transform=`translateY(0)`},children:[(0,F.jsx)(h,{size:14,color:`#ff5252`}),` Изпрати Сигнал`]})]})]})]})]}),(0,F.jsxs)(`div`,{style:{maxWidth:`1200px`,margin:`3rem auto 0`,padding:`2rem 0`,borderTop:`1px solid rgba(255,255,255,0.05)`,display:`flex`,flexDirection:`column`,gap:`1.5rem`,fontSize:`0.75rem`,color:`rgba(255,255,255,0.3)`},children:[(0,F.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1.5rem`,alignItems:`center`,textAlign:`center`},children:[(0,F.jsxs)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:`1.5rem`,justifyContent:`center`},children:[(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`strong`,{children:`ФИРМА:`}),` ДАРИ КОМЕРС - НА (ООД)`]}),(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`strong`,{children:`АДРЕС:`}),` гр. Плевен, ул. ДАНАИЛ ПОПОВ 12`]}),(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`strong`,{children:`УПРАВИТЕЛ:`}),` ДАРИНКА ЦВЕТАНОВА КРЪСТЕВА`]}),(0,F.jsxs)(`div`,{children:[(0,F.jsx)(`strong`,{children:`ЕИК/ДДС:`}),` BG114601542`]})]}),(0,F.jsx)(`div`,{style:{padding:`0.4rem 1.2rem`,background:`rgba(0,173,181,0.05)`,borderRadius:`100px`,border:`1px solid rgba(0,173,181,0.1)`,color:`rgba(0,173,181,0.6)`,fontWeight:700,fontSize:`0.8rem`},children:`Услугата се изпълнява по договор за обществен превоз с Община Плевен`})]}),(0,F.jsxs)(`div`,{style:{display:`flex`,flexWrap:`wrap`,gap:`1rem`,alignItems:`center`,justifyContent:`center`,borderTop:`1px solid rgba(255,255,255,0.02)`,paddingTop:`1rem`},children:[(0,F.jsx)(`span`,{style:{fontWeight:700,textTransform:`uppercase`,letterSpacing:`1px`,fontSize:`0.65rem`},children:`Контролни органи:`}),(0,F.jsx)(`a`,{href:`https://kzp.bg`,target:`_blank`,rel:`noopener noreferrer`,style:{color:`inherit`,textDecoration:`underline`},children:`КЗП`}),(0,F.jsx)(`span`,{style:{opacity:.3},children:`•`}),(0,F.jsx)(`a`,{href:`https://www.rta.government.bg`,target:`_blank`,rel:`noopener noreferrer`,style:{color:`inherit`,textDecoration:`underline`},children:`ИААА`}),(0,F.jsx)(`span`,{style:{opacity:.3},children:`•`}),(0,F.jsx)(`a`,{href:`https://cpdp.bg`,target:`_blank`,rel:`noopener noreferrer`,style:{color:`inherit`,textDecoration:`underline`},children:`КЗЛД`})]})]})]})]})};export{L as default};