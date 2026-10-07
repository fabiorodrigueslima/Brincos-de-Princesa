import { useState } from 'react';
import { mutateAdminResource } from '../../services/api.js';

export function AdminImageUpload({ productId, csrfToken }) {
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.image.files[0];
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 5 * 1024 * 1024) { setMessage('Selecione JPG, PNG ou WebP de até 5 MB.'); return; }
    setBusy(true); setMessage('Enviando imagem…');
    try {
      const { data } = await mutateAdminResource('images/sign','POST',{ productId:Number(productId), mime:file.type, bytes:file.size, alt:form.elements.alt.value, primary:form.elements.primary.checked },csrfToken);
      const body = new FormData();
      for (const [key,value] of Object.entries(data.fields)) body.append(key,String(value));
      body.append('file',file);
      const uploaded = await fetch(data.uploadUrl,{ method:'POST', body, credentials:'omit' });
      if (!uploaded.ok) throw new Error('Não foi possível enviar a imagem. Tente novamente.');
      await mutateAdminResource('images/complete','POST',{ id:data.id },csrfToken);
      setMessage('Imagem cadastrada.'); form.reset();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <form onSubmit={submit}><label>Imagem<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Descrição da imagem<input name="alt" minLength="2" maxLength="180" required /></label><label><input name="primary" type="checkbox" />Imagem principal</label><button disabled={busy}>Enviar imagem</button><p role="status">{message}</p></form>;
}
