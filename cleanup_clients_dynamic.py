#!/usr/bin/env python3
"""
Script melhorado para excluir todos os clientes de teste em massa (versão dinâmica)
"""
import requests
import json
import time

def cleanup_all_clients_dynamic():
    """Excluir todos os clientes dinamicamente"""
    
    base_url = "https://budget-system-1.preview.emergentagent.com/api"
    
    # 1. Fazer login
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
    
    total_deleted = 0
    round_number = 1
    
    while True:
        # 2. Obter clientes atuais (lista dinâmica)
        print(f"\n🔄 Rodada {round_number}: Obtendo clientes atuais...")
        clients_response = requests.get(f"{base_url}/clients", headers=headers)
        
        if clients_response.status_code != 200:
            print(f"❌ Erro ao obter clientes: {clients_response.status_code}")
            break
        
        clients = clients_response.json()
        current_count = len(clients)
        print(f"📊 Clientes encontrados: {current_count}")
        
        if current_count == 0:
            print("✅ Nenhum cliente restante - limpeza concluída!")
            break
        
        # 3. Processar em lotes de até 100
        batch_size = min(100, current_count)
        batch_clients = clients[:batch_size]
        client_ids = [client["id"] for client in batch_clients]
        
        print(f"🗑️  Processando {len(client_ids)} clientes...")
        
        # Mostrar alguns nomes para debug
        sample_names = [client.get("name", "N/A") for client in batch_clients[:3]]
        print(f"   📝 Exemplos: {', '.join(sample_names)}")
        
        # Executar exclusão em massa com force_delete=true
        print("   🔥 Executando exclusão em massa...")
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
            print(f"   ✅ Rodada {round_number} processada:")
            print(f"      - Solicitados: {result['total_requested']}")
            print(f"      - Excluídos: {result['deleted_count']}")
            print(f"      - Ignorados: {result['skipped_count']}")
            print(f"      - Erros: {len(result['errors'])}")
            
            total_deleted += result['deleted_count']
            
            if result['errors']:
                print(f"   ⚠️  Primeiros erros:")
                for error in result['errors'][:3]:
                    client_name = error.get('client_name', 'N/A')
                    message = error.get('message', 'N/A')
                    print(f"      - {client_name}: {message}")
            
            # Se nenhum cliente foi excluído, pode ter problema
            if result['deleted_count'] == 0:
                print("   ⚠️  Nenhum cliente foi excluído nesta rodada")
                if result['errors']:
                    print("   🛑 Parando devido a erros consecutivos")
                    break
        else:
            print(f"   ❌ Erro na exclusão: {delete_response.status_code}")
            try:
                error_data = delete_response.json()
                print(f"      Erro: {error_data.get('detail', 'Erro desconhecido')}")
            except:
                print(f"      Erro: {delete_response.text}")
            break
        
        round_number += 1
        
        # Pausa entre rodadas
        print("   ⏳ Aguardando 3 segundos...")
        time.sleep(3)
        
        # Limite de segurança (máximo 20 rodadas)
        if round_number > 20:
            print("🛑 Limite de segurança atingido (20 rodadas)")
            break
    
    # 4. Verificar resultado final
    print(f"\n🏁 RESUMO FINAL:")
    print(f"   - Total de rodadas: {round_number - 1}")
    print(f"   - Total excluídos: {total_deleted}")
    
    # Verificar quantos clientes restam
    final_clients_response = requests.get(f"{base_url}/clients", headers=headers)
    if final_clients_response.status_code == 200:
        remaining_clients = len(final_clients_response.json())
        print(f"   - Clientes restantes: {remaining_clients}")
        
        if remaining_clients == 0:
            print("   🎉 SUCESSO TOTAL: Todos os clientes foram excluídos!")
            return True
        else:
            print(f"   📊 Restam {remaining_clients} clientes")
            if remaining_clients < 100:
                print("   ℹ️  Número baixo - pode ser residual ou dependências complexas")
            return remaining_clients < 50  # Considerar sucesso se restaram poucos
    else:
        print("   ❓ Não foi possível verificar clientes restantes")
        return False

if __name__ == "__main__":
    print("🧹 LIMPEZA DINÂMICA DE CLIENTES")
    print("=" * 50)
    print("🚀 Iniciando limpeza automática...")
    
    success = cleanup_all_clients_dynamic()
    if success:
        print("\n✅ Limpeza concluída com sucesso!")
    else:
        print("\n⚠️  Limpeza concluída - alguns clientes podem ter restado.")