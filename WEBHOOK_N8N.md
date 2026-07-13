# Webhook de leads — Leadium CRM

Endpoint de produção:

`POST https://SEU-DOMINIO.com/api/webhooks/leads`

No n8n, use um node **HTTP Request**, método `POST`, conteúdo `JSON` e envie o payload abaixo. Configure obrigatoriamente `LEAD_WEBHOOK_SECRET` na hospedagem e envie o mesmo valor no header `x-webhook-secret`.

```bash
curl --request POST \
  --url 'https://SEU-DOMINIO.com/api/webhooks/leads' \
  --header 'Content-Type: application/json' \
  --header 'x-webhook-secret: TROQUE_PELO_SEU_SEGREDO' \
  --data-raw '{
    "evento": "aplicacao_estrategica_leadium",
    "origem": "site_leadium_premium",
    "lead": {
      "nome_completo": "Giovani",
      "email": "leadium@gmail.com",
      "whatsapp": "15996333796",
      "instagram": "@batistaftw",
      "nicho": "Fitness",
      "faturamento_mensal_atual": "Até R$ 5 mil"
    },
    "contexto": {
      "interesse": "Transformar audiência em produto e operação proprietária",
      "formulario": "Aplicação estratégica Leadium",
      "pagina": "https://agencialeadium.com/#aplicar",
      "data_hora_envio": "2026-07-13T03:03:40.249Z",
      "dispositivo": "desktop"
    }
  }'
```

Teste local: troque a URL por `http://localhost:3013/api/webhooks/leads`.

Resposta de sucesso: HTTP `201`, com `success: true` e o lead criado.
