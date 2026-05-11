#!/bin/bash

# Suite de tests completa para el flujo conversacional

API_URL="http://localhost:3000/api/chat"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "   SUITE DE TESTS - FLUJO CONVERSACIONAL PROGRESIVO"
echo "══════════════════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

test_conversation() {
  local test_name="$1"
  shift
  local -a messages=("$@")

  local sid="test_$(date +%s)_${RANDOM}"

  echo "TEST: $test_name"
  echo "Session: $sid"
  echo ""

  for msg in "${messages[@]}"; do
    echo "  👤 → $msg"

    local resp=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"mensaje\": \"$msg\", \"session_id\": \"$sid\"}")

    local respuesta=$(echo "$resp" | grep -o '"respuesta":"[^"]*"' | sed 's/"respuesta":"//;s/"$//' | sed 's/\\n/ /g')
    local phase=$(echo "$resp" | grep -o '"phase":"[^"]*"' | sed 's/"phase":"//;s/"$//')
    local captured=$(echo "$resp" | grep -o '"captured_data":{[^}]*}')

    echo "  🤖 [$phase] $(echo "$respuesta" | head -c 100)..."
    if [ -n "$captured" ]; then
      echo "     📋 Datos: $captured"
    fi
    echo ""

    sleep 1
  done

  # Check final data
  local final=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"mensaje\": \"estado\", \"session_id\": \"$sid\"}")

  local has_nombre=$(echo "$final" | grep -o '"nombre":"[^"]*"')
  local has_telefono=$(echo "$final" | grep -o '"telefono":"[^"]*"')

  if [ -n "$has_nombre" ] && [ -n "$has_telefono" ]; then
    echo "  ✅ PASS - Capturó datos mínimos"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL - Faltan datos: nombre=$has_nombre telefono=$has_telefono"
    FAIL=$((FAIL + 1))
  fi

  echo ""
  echo "──────────────────────────────────────────────────────────"
  echo ""
}

# TEST 1: Flujo ideal con datos explícitos
test_conversation "Flujo Ideal" \
  "Hola" \
  "Me gustaría un masaje descontracturante" \
  "Vale, me interesa" \
  "Me llamo Juan Pérez" \
  "Estoy en 28004" \
  "El descontracturante está bien" \
  "Mañana por la tarde" \
  "A las 17:00" \
  "Calle Hortaleza 45, 3A" \
  "Mi teléfono es 666123456"

# TEST 2: Cliente da múltiples datos a la vez
test_conversation "Datos Múltiples" \
  "Hola, soy María de 28010, quiero reservar masaje relajante para mañana" \
  "A las 18h en Calle Gran Vía 28" \
  "666777888"

# TEST 3: Cliente da datos fuera de orden
test_conversation "Fuera de Orden" \
  "Quiero un masaje" \
  "666555444" \
  "Soy Carlos" \
  "28015" \
  "Deportivo" \
  "Pasado mañana" \
  "Por la mañana" \
  "Avenida América 100"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "   RESULTADOS FINALES"
echo "══════════════════════════════════════════════════════════"
echo "   ✅ Pass: $PASS"
echo "   ❌ Fail: $FAIL"
echo "══════════════════════════════════════════════════════════"
echo ""
