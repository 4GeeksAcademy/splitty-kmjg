import socket

regions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-central-1", "eu-west-1", "sa-east-1", "ap-southeast-1"]
user = "postgres.qcpboebyuttrhbkljrrj"

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    try:
        # Just check if port is open first
        with socket.create_connection((host, 6543), timeout=3):
            print(f"Port 6543 is OPEN on {host}")
    except Exception as e:
        print(f"Port 6543 is CLOSED on {host}: {e}")
