# Webhook Asaas — Leadium CRM

Endpoint de produção:

`POST https://SEU-DOMINIO.com/api/webhooks/asaas`

Teste local: troque a URL por `http://localhost:3000/api/webhooks/asaas` (ou a porta configurada em `PORT`).

## Cadastro no painel do Asaas

1. Acesse o painel Asaas (sandbox ou produção, conforme o ambiente que estiver testando) → **Configurações → Integrações → Webhooks**.
2. Crie um novo webhook com:
   - **URL**: a URL do endpoint acima.
   - **Token de autenticação**: o mesmo valor salvo em `ASAAS_WEBHOOK_TOKEN` no `.env`. O Asaas envia esse valor de volta no header `asaas-access-token` em toda notificação — é assim que o servidor confirma que a chamada é legítima.
   - **Eventos**: marque pelo menos `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `TRANSFER_DONE`, `TRANSFER_FAILED`, `TRANSFER_CANCELLED`.
   - **Versão da API**: v3.
3. Salve. O Asaas costuma oferecer um botão de "testar" que dispara um evento de exemplo — use pra confirmar que o servidor responde `200`.

Se você já tem esse webhook cadastrado (fase 1), não precisa criar outro — só edite o mesmo e marque também os 3 eventos `TRANSFER_*` na lista.

## O que acontece quando um evento chega

- O evento é gravado em `leadium_asaas_webhook_events` (idempotência — reenvios do mesmo evento são ignorados).
- **Cobrança de cliente** (`PAYMENT_*`): a cobrança correspondente é buscada/criada em `leadium_client_payments` e seu `status` é atualizado (`pending`/`paid`/`overdue`/`cancelled`). Quando o status vira `paid`, uma linha nova aparece automaticamente em `leadium_transactions` (categoria "Recebimento Cliente", conta "Asaas").
- **Recebimento avulso** (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` sem cobrança correspondente no CRM — ex: link de pagamento criado direto no painel Asaas): lança como receita "Outros" em `leadium_transactions`, sem vincular a cliente.
- **Transferência de saldo** (`TRANSFER_DONE`): toda vez que você envia dinheiro do saldo Asaas (TED, Pix ou pra outra conta Asaas), lança automaticamente uma despesa "Transferência Asaas" em `leadium_transactions`. `TRANSFER_FAILED` só gera uma notificação no sino do CRM (não lança nada, já que o dinheiro não saiu).
- Tudo isso aparece direto na tela de Transações do CRM — sem lançamento manual.

## Ambiente

Enquanto `ASAAS_ENV=sandbox` no `.env`, todas as chamadas (criação de cliente/cobrança/assinatura e o webhook) usam `api-sandbox.asaas.com`. Só mude pra `production` — e troque `ASAAS_API_KEY` pela chave de produção — depois de validar o fluxo completo em sandbox.
