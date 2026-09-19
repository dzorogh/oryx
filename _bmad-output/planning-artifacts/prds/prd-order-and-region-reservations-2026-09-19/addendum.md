# PRD addendum

## Mechanism (not in PRD body)

- Posting RPC: одно `store_post_reservation` без ветки `operation`.
- Direction выводится: `to_owner` NULL → release; `from_owner` NULL → reserve; оба заданы → reassign.
- Trigger `store_assert_owner(type, id)`: NULL/NULL ok; `order` → exists `store_customer_order`; `region` → exists `store_region`.
- Transfer allocation и output allocation: `owner_type` + `owner_id` вместо order line.
- Shipment line: `product_id` + header `customer_order_id`; `customer_order_line_id` удаляется.
- Unique `store_customer_order_line (order_id, product_id)`.

## Options considered

| Option | Verdict |
|---|---|
| Soft earmark | Rejected in brainstorm |
| Header-only source | Rejected: forced many documents for mixed sources |
| Free as owner type | Rejected: asymmetric; Free = NULL owner |
