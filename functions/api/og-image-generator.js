import { ImageResponse } from 'workers-og';

export const config = {
  runtime: 'edge',
};

export async function onRequest(context) {
  try {
    const { request } = context; // 'env' n'est plus nécessaire pour les polices
    const requestUrl = new URL(request.url);
    const params = requestUrl.searchParams;

    // --- MODIFICATION : Construire les URL publiques complètes pour les polices ---
    const fontUrlRegular = new URL('/fonts/Urbanist-Regular.ttf', requestUrl.origin);
    const fontUrlBold = new URL('/fonts/Urbanist-Bold.ttf', requestUrl.origin);

    // --- MODIFICATION : Utiliser un fetch standard au lieu de env.ASSETS.fetch ---
    const [fontRegular, fontBold] = await Promise.all([
      fetch(fontUrlRegular).then(res => res.arrayBuffer()),
      fetch(fontUrlBold).then(res => res.arrayBuffer()),
    ]);
    // --- FIN DES MODIFICATIONS ---

    const title = params.get('title') || 'Titre non disponible';
    const author = params.get('author') || 'Auteur inconnu';
    const coverUrl = params.get('cover');
    const siteIconUrl = new URL('/img/icon.png', requestUrl.origin).toString();

    const template = {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          fontFamily: 'Urbanist',
          color: '#ffffff',
          overflow: 'hidden',
        },
        children: [
          // Image de fond floutée
          {
            type: 'img',
            props: {
              src: coverUrl,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(14px) brightness(0.4)',
                opacity: 0.9,
              },
            },
          },
          // Couche principale : 2 colonnes sans padding global
          {
            type: 'div',
            props: {
              style: {
                position: 'relative',
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
                height: '100%',
                gap: '60px',
              },
              children: [
                // Image nette, pleine hauteur
                {
                  type: 'img',
                  props: {
                    src: coverUrl,
                    style: {
                      height: '100%',
                      width: '420px',
                      objectFit: 'cover',
                      borderRadius: '0',
                      boxShadow: '0 0 40px rgba(0,0,0,0.3)',
                    },
                  },
                },
                // Colonne texte avec padding local
                {
                  type: 'div',
                  props: {
                    style: {
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '32px',
                      padding: '60px 60px 60px 0',
                      boxSizing: 'border-box',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '72px',
                            fontWeight: 700,
                            lineHeight: '1.2',
                            textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
                          },
                          children: title,
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '36px',
                            fontWeight: 400,
                            color: '#cccccc',
                            textShadow: '1px 1px 4px rgba(0,0,0,0.7)',
                          },
                          children: author,
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            marginTop: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            fontSize: '36px',
                            color: '#cccccc',
                          },
                          children: [
                            {
                              type: 'img',
                              props: {
                                src: siteIconUrl,
                                style: {
                                  width: '40px',
                                  height: '40px',
                                },
                              },
                            },
                            {
                              type: 'span',
                              props: {
                                children: 'BigSolo.org',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    return new ImageResponse(template, {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Urbanist', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'Urbanist', data: fontBold, weight: 700, style: 'normal' },
      ],
    });
  } catch (error) {
    console.error('Erreur de génération d’image OG:', error);
    return new Response('Échec de la génération de l’image', { status: 500 });
  }
}