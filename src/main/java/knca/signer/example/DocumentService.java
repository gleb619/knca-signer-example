package knca.signer.example;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class DocumentService {

    private final Map<String, Document> documents = new HashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    @PostConstruct
    public void init() {
        // Generate 3 sample XML documents
        createSampleDocument("<document><title>Sample Document 1</title><content>This is the first sample document for signing.</content></document>");
        createSampleDocument("<document><title>Sample Document 2</title><content>This is the second sample document for signing.</content></document>");
        createSampleDocument("<document><title>Sample Document 3</title><content>This is the third sample document for signing.</content></document>");
    }

    private void createSampleDocument(String content) {
        String id = "doc-" + idGenerator.getAndIncrement();
        documents.put(id, new Document(id, content));
    }

    public List<Document> getAllDocuments() {
        return new ArrayList<>(documents.values());
    }

    public Document createDocument(String content) {
        String id = "doc-" + idGenerator.getAndIncrement();
        Document doc = new Document(id, content);
        documents.put(id, doc);
        return doc;
    }

    public boolean signDocument(String id, String signature) {
        Document doc = documents.get(id);
        if (doc != null && !doc.isSigned()) {
            doc.setSignature(signature);
            return true;
        }
        return false;
    }
}
