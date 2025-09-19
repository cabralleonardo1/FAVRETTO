#!/usr/bin/env python3
"""
Script para excluir todos os clientes de teste em massa
"""
import requests
import json
import time

def cleanup_all_test_clients():
    """Excluir todos os clientes de teste usando a API de exclusão em massa"""
    
    base_url = "https://budget-system-1.preview.emergentagent.com/api"
    
    # 1. Fazer login para obter token
    print("🔐 Fazendo login...")
    login_response = requests.post(
        f"{base_url}/auth/login",
        json={"username": "admin", "password": "admin123"},
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code != 200:
        print(f"❌ Erro no login: {login_response.status_code}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # 2. Obter lista de todos os clientes
    print("📋 Obtendo lista de clientes...")
    clients_response = requests.get(f"{base_url}/clients", headers=headers)
    
    if clients_response.status_code != 200:
        print(f"❌ Erro ao obter clientes: {clients_response.status_code}")
        return False
    
    clients = clients_response.json()
    total_clients = len(clients)
    print(f"📊 Total de clientes encontrados: {total_clients}")
    
    if total_clients == 0:
        print("✅ Nenhum cliente para excluir")
        return True
    
    # 3. Excluir em lotes de 100 (limite da API)
    batch_size = 100
    total_deleted = 0
    batch_number = 1
    
    for i in range(0, total_clients, batch_size):
        batch_clients = clients[i:i + batch_size]
        client_ids = [client["id"] for client in batch_clients]
        
        print(f"\n🗑️  Processando lote {batch_number} ({len(client_ids)} clientes)...")
        
        # Primeiro, verificar dependências
        print("   🔍 Verificando dependências...")
        deps_response = requests.post(
            f"{base_url}/clients/check-dependencies",
            json=client_ids,
            headers=headers
        )
        
        if deps_response.status_code == 200:
            deps_data = deps_response.json()
            print(f"   📈 Clientes com dependências: {deps_data['clients_with_dependencies']}")
            print(f"   📊 Total de orçamentos: {deps_data['total_budgets']}")
            print(f"   💰 Valor total: R$ {deps_data['total_budget_value']:,.2f}")
        
        # Executar exclusão em massa com force_delete=true
        print("   🔥 Executando exclusão em massa (com force_delete)...")
        delete_response = requests.post(
            f"{base_url}/clients/bulk-delete",
            json={
                "client_ids": client_ids,
                "force_delete": True
            },
            headers=headers
        )
        
        if delete_response.status_code == 200:
            result = delete_response.json()
            print(f"   ✅ Lote {batch_number} processado:")
            print(f"      - Solicitados: {result['total_requested']}")
            print(f"      - Excluídos: {result['deleted_count']}")
            print(f"      - Ignorados: {result['skipped_count']}")
            print(f"      - Erros: {len(result['errors'])}")
            
            total_deleted += result['deleted_count']
            
            if result['errors']:
                print(f"   ⚠️  Erros encontrados:")
                for error in result['errors'][:3]:  # Mostrar apenas os primeiros 3
                    print(f"      - {error.get('client_name', 'N/A')}: {error.get('message', 'N/A')}")
        else:
            print(f"   ❌ Erro na exclusão do lote {batch_number}: {delete_response.status_code}")
            try:
                error_data = delete_response.json()
                print(f"      Erro: {error_data.get('detail', 'Erro desconhecido')}")
            except:
                print(f"      Erro: {delete_response.text}")
        
        batch_number += 1
        
        # Pequena pausa entre lotes para evitar sobrecarga
        if i + batch_size < total_clients:
            print("   ⏳ Aguardando 2 segundos antes do próximo lote...")
            time.sleep(2)
    
    # 4. Verificar resultado final
    print(f"\n🏁 RESUMO FINAL:")
    print(f"   - Total de clientes iniciais: {total_clients}")
    print(f"   - Total excluídos com sucesso: {total_deleted}")
    
    # Verificar quantos clientes restam
    final_clients_response = requests.get(f"{base_url}/clients", headers=headers)
    if final_clients_response.status_code == 200:
        remaining_clients = len(final_clients_response.json())
        print(f"   - Clientes restantes: {remaining_clients}")
        
        if remaining_clients == 0:
            print("   🎉 SUCESSO: Todos os clientes foram excluídos!")
            return True
        else:
            print(f"   ⚠️  Ainda restam {remaining_clients} clientes")
            return False
    else:
        print("   ❓ Não foi possível verificar clientes restantes")
        return False

if __name__ == "__main__":
    print("🧹 LIMPEZA DE CLIENTES DE TESTE")
    print("=" * 50)
    print("⚠️  ATENÇÃO: Esta operação irá excluir TODOS os clientes!")
    print("⚠️  Isso inclui clientes E seus orçamentos associados!")
    print("=" * 50)
    print("🚀 Iniciando limpeza automática conforme solicitado...")
    
    success = cleanup_all_test_clients()
    if success:
        print("\n✅ Limpeza concluída com sucesso!")
    else:
        print("\n❌ Limpeza concluída com problemas.")